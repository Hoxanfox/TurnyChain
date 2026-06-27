package service

import (
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-message/mail"
)

type ImapService interface {
	Start()
	Restart()
}

type imapService struct {
	settingService SettingService
	processor      EmailProcessor
	stopChan       chan struct{}
}

func NewImapService(settingService SettingService, processor EmailProcessor) ImapService {
	return &imapService{
		settingService: settingService,
		processor:      processor,
		stopChan:       make(chan struct{}),
	}
}

func (s *imapService) Start() {
	go s.runLoop()
}

func (s *imapService) Restart() {
	// Signal to stop current loop if possible, but simpler to just set a flag or
	// interrupt the sleep. For simplicity, we just stop and start a new loop.
	close(s.stopChan)
	s.stopChan = make(chan struct{})
	go s.runLoop()
}

func (s *imapService) runLoop() {
	log.Println("[IMAP] Starting IMAP service worker...")

	for {
		select {
		case <-s.stopChan:
			log.Println("[IMAP] Stopping current worker loop.")
			return
		default:
		}

		userSetting, _ := s.settingService.GetSetting("gmail_user")
		passSetting, _ := s.settingService.GetSetting("gmail_app_password")

		if userSetting == nil || passSetting == nil || userSetting.Value == "" || passSetting.Value == "" {
			// Try again in 60 seconds
			time.Sleep(60 * time.Second)
			continue
		}

		err := s.pollEmails(userSetting.Value, passSetting.Value)
		if err != nil {
			log.Printf("[IMAP] Error: %v. Retrying in 30 seconds...\n", err)
			time.Sleep(30 * time.Second)
		} else {
			// Successful poll but ended? Wait and poll again.
			time.Sleep(15 * time.Second)
		}
	}
}

func (s *imapService) pollEmails(username, password string) error {
	log.Printf("[IMAP] Connecting to imap.gmail.com:993 as %s\n", username)

	c, err := client.DialTLS("imap.gmail.com:993", nil)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	defer c.Logout()

	if err := c.Login(username, password); err != nil {
		return fmt.Errorf("login failed: %w", err)
	}

	_, err = c.Select("INBOX", false)
	if err != nil {
		return fmt.Errorf("select INBOX failed: %w", err)
	}

	criteria := imap.NewSearchCriteria()
	criteria.WithoutFlags = []string{imap.SeenFlag}

	seqNums, err := c.Search(criteria)
	if err != nil {
		return fmt.Errorf("search failed: %w", err)
	}

	if len(seqNums) == 0 {
		return nil
	}

	seqset := new(imap.SeqSet)
	seqset.AddNum(seqNums...)

	var section imap.BodySectionName
	items := []imap.FetchItem{section.FetchItem(), imap.FetchEnvelope}

	messages := make(chan *imap.Message, 10)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, items, messages)
	}()

	for msg := range messages {
		r := msg.GetBody(&section)
		if r == nil {
			continue
		}

		mr, err := mail.CreateReader(r)
		if err != nil {
			log.Printf("[IMAP] Failed to read message body: %v\n", err)
			continue
		}

		var bodyText string

		for {
			p, err := mr.NextPart()
			if err == io.EOF {
				break
			} else if err != nil {
				log.Printf("[IMAP] NextPart error: %v\n", err)
				break
			}

			switch h := p.Header.(type) {
			case *mail.InlineHeader:
				contentType, _, _ := h.ContentType()
				if strings.HasPrefix(contentType, "text/") {
					b, _ := io.ReadAll(p.Body)
					bodyText += string(b)
				}
			}
		}

		subject := ""
		if msg.Envelope != nil {
			subject = msg.Envelope.Subject
		}

		// Delegamos al procesador (SOLID DIP, SRP)
		err = s.processor.ProcessEmail(subject, bodyText)
		if err != nil {
			log.Printf("[IMAP] Processor failed to process email: %v\n", err)
		} else {
			log.Printf("[IMAP] Successfully processed email: %s\n", subject)
		}
	}

	if err := <-done; err != nil {
		return fmt.Errorf("fetch error: %w", err)
	}

	// Mark as SEEN
	item := imap.FormatFlagsOp(imap.AddFlags, true)
	flags := []interface{}{imap.SeenFlag}
	if err := c.Store(seqset, item, flags, nil); err != nil {
		return fmt.Errorf("store flags failed: %w", err)
	}

	return nil
}
