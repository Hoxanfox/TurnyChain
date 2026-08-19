package service

import (
    "context"
    "crypto/tls"
    "fmt"
    "log"
    "net"
    "net/smtp"
    "strconv"
    "strings"
    "time"
)

// Mailer provides a resilient asynchronous email sender.
type Mailer interface {
    SendAsync(to []string, subject, body string)
    Shutdown()
}

type mailJob struct {
    to      []string
    subject string
    body    string
    tries   int
}

type mailerService struct {
    settingService SettingService
    queue          chan *mailJob
    stopCh         chan struct{}
}

// NewMailer creates and starts a background mailer worker.
// It never panics; if SMTP isn't configured it will log and drop messages.
func NewMailer(settingService SettingService) Mailer {
    m := &mailerService{
        settingService: settingService,
        queue:          make(chan *mailJob, 100),
        stopCh:         make(chan struct{}),
    }

    go m.run()
    return m
}

func (m *mailerService) SendAsync(to []string, subject, body string) {
    select {
    case m.queue <- &mailJob{to: to, subject: subject, body: body, tries: 0}:
    default:
        // Queue full: log and drop to avoid blocking the app
        log.Printf("[MAILER] Queue full, dropping email to %v subject=%s\n", to, subject)
    }
}

func (m *mailerService) Shutdown() {
    close(m.stopCh)
}

func (m *mailerService) run() {
    log.Println("[MAILER] Mailer worker started")
    for {
        select {
        case <-m.stopCh:
            log.Println("[MAILER] Stopping mailer worker")
            return
        case job := <-m.queue:
            if job == nil {
                continue
            }
            m.handleJob(job)
        }
    }
}

func (m *mailerService) handleJob(job *mailJob) {
    maxRetries := 5
    baseDelay := 5 * time.Second

    for {
        err := m.attemptSend(job)
        if err == nil {
            log.Printf("[MAILER] Sent email to %v subject=%s\n", job.to, job.subject)
            return
        }

        job.tries++
        if job.tries >= maxRetries {
            log.Printf("[MAILER] Giving up after %d tries sending to %v: %v\n", job.tries, job.to, err)
            return
        }

        // Exponential backoff with jitter
        delay := baseDelay * time.Duration(1<<uint(job.tries-1))
        jitter := time.Duration((time.Now().UnixNano()%1000)) * time.Millisecond
        wait := delay + jitter
        log.Printf("[MAILER] Error sending email (try %d): %v. Retrying in %s\n", job.tries, err, wait)
        select {
        case <-time.After(wait):
            // retry
        case <-m.stopCh:
            log.Println("[MAILER] Stopping during retry wait")
            return
        }
    }
}

func (m *mailerService) attemptSend(job *mailJob) error {
    hostSetting, _ := m.settingService.GetSetting("smtp_host")
    portSetting, _ := m.settingService.GetSetting("smtp_port")
    userSetting, _ := m.settingService.GetSetting("smtp_user")
    passSetting, _ := m.settingService.GetSetting("smtp_password")
    timeoutSetting, _ := m.settingService.GetSetting("smtp_timeout_seconds")

    if hostSetting == nil || hostSetting.Value == "" {
        return fmt.Errorf("smtp_host not configured")
    }

    port := "587"
    if portSetting != nil && portSetting.Value != "" {
        port = portSetting.Value
    }

    timeoutSec := 15
    if timeoutSetting != nil && timeoutSetting.Value != "" {
        if v, err := strconv.Atoi(timeoutSetting.Value); err == nil && v > 0 {
            timeoutSec = v
        }
    }

    addr := net.JoinHostPort(hostSetting.Value, port)

    // Prepare message
    headers := make(map[string]string)
    headers["From"] = userSetting.Value
    headers["To"] = strings.Join(job.to, ",")
    headers["Subject"] = job.subject
    headers["MIME-Version"] = "1.0"
    headers["Content-Type"] = "text/plain; charset=UTF-8"

    var msg strings.Builder
    for k, v := range headers {
        msg.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
    }
    msg.WriteString("\r\n")
    msg.WriteString(job.body)

    // Dial with timeout
    ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSec)*time.Second)
    defer cancel()

    var conn net.Conn
    var err error
    d := &net.Dialer{}
    conn, err = d.DialContext(ctx, "tcp", addr)
    if err != nil {
        return fmt.Errorf("dial error: %w", err)
    }

    // Upgrade to TLS if port is 465 or server supports STARTTLS
    client, err := smtp.NewClient(conn, hostSetting.Value)
    if err != nil {
        conn.Close()
        return fmt.Errorf("smtp client error: %w", err)
    }
    defer client.Quit()

    // Try STARTTLS if supported
    if ok, _ := client.Extension("STARTTLS"); ok {
        tlsConfig := &tls.Config{ServerName: hostSetting.Value}
        if err = client.StartTLS(tlsConfig); err != nil {
            client.Close()
            return fmt.Errorf("starttls failed: %w", err)
        }
    }

    // Auth if provided
    if userSetting != nil && userSetting.Value != "" && passSetting != nil {
        auth := smtp.PlainAuth("", userSetting.Value, passSetting.Value, hostSetting.Value)
        if err = client.Auth(auth); err != nil {
            client.Close()
            return fmt.Errorf("auth failed: %w", err)
        }
    }

    if err = client.Mail(userSetting.Value); err != nil {
        client.Close()
        return fmt.Errorf("mail from failed: %w", err)
    }

    for _, rcpt := range job.to {
        if err = client.Rcpt(rcpt); err != nil {
            client.Close()
            return fmt.Errorf("rcpt to %s failed: %w", rcpt, err)
        }
    }

    wc, err := client.Data()
    if err != nil {
        client.Close()
        return fmt.Errorf("data command failed: %w", err)
    }

    if _, err = wc.Write([]byte(msg.String())); err != nil {
        wc.Close()
        client.Close()
        return fmt.Errorf("write body failed: %w", err)
    }
    if err = wc.Close(); err != nil {
        client.Close()
        return fmt.Errorf("close body failed: %w", err)
    }

    // success
    return nil
}
