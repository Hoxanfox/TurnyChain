package service

// EmailProcessor is an interface for processing incoming emails.
// Following SOLID (Interface Segregation and Dependency Inversion), the IMAP service
// only depends on this interface to deliver the parsed text.
type EmailProcessor interface {
	ProcessEmail(subject string, body string) error
}
