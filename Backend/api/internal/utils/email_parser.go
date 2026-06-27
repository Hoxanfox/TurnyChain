package utils

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

var (
	amountRegex = regexp.MustCompile(`(?i)Recibiste[\s\$]*([\d\.\,]+)\s+de`)
	senderRegex = regexp.MustCompile(`(?i)de\s+(.*?)\s+el`)
	// We handle various date/time formats just in case
	dateRegex = regexp.MustCompile(`(?i)el\s+(.*?)\s+a\s+las\s+(.*?)[,\.]`)
	bankRegex = regexp.MustCompile(`(?i)desde\s+el\s+banco\s+(.*?)\.`)
)

func ParseNequiEmail(rawText string) (*domain.BankTransfer, error) {
	transfer := &domain.BankTransfer{
		ID:        uuid.New().String(),
		RawText:   rawText,
		IsUsed:    false,
		Timestamp: time.Now(), // Default to now if we can't parse exact time
		BankName:  "Nequi",    // Default bank name if not found
	}

	// Clean text to avoid newlines breaking regex easily
	cleanText := strings.ReplaceAll(rawText, "\n", " ")
	cleanText = strings.ReplaceAll(cleanText, "\r", " ")
	
	// Strip HTML tags
	htmlRe := regexp.MustCompile(`<[^>]*>`)
	cleanText = htmlRe.ReplaceAllString(cleanText, " ")
	
	// Replace non-breaking spaces and common entities
	cleanText = strings.ReplaceAll(cleanText, "&nbsp;", " ")
	cleanText = strings.ReplaceAll(cleanText, "&#39;", "'")
	cleanText = strings.ReplaceAll(cleanText, "&quot;", "\"")
	cleanText = strings.ReplaceAll(cleanText, "&amp;", "&")

	// Collapse multiple spaces
	spaceRe := regexp.MustCompile(`\s+`)
	cleanText = spaceRe.ReplaceAllString(cleanText, " ")
	cleanText = strings.TrimSpace(cleanText)
	
	fmt.Printf("[EmailParser] Texto limpio (tras remover HTML): %s\n", cleanText)

	// 1. Amount
	amountMatches := amountRegex.FindStringSubmatch(cleanText)
	if len(amountMatches) > 1 {
		amtStr := strings.ReplaceAll(amountMatches[1], ".", "")
		amtStr = strings.ReplaceAll(amtStr, ",", "")
		if amt, err := strconv.ParseFloat(amtStr, 64); err == nil {
			transfer.Amount = amt
		}
	} else {
		return nil, fmt.Errorf("no se pudo extraer el monto del correo")
	}

	// 2. Sender
	senderMatches := senderRegex.FindStringSubmatch(cleanText)
	if len(senderMatches) > 1 {
		transfer.Sender = strings.TrimSpace(senderMatches[1])
	} else {
		return nil, fmt.Errorf("no se pudo extraer el remitente del correo")
	}

	// 3. Bank (Optional)
	bankMatches := bankRegex.FindStringSubmatch(cleanText)
	if len(bankMatches) > 1 {
		transfer.BankName = strings.TrimSpace(bankMatches[1])
	}

	// 4. Date (Best effort parsing, otherwise fallback to time.Now in Colombia Time)
	colombiaZone := time.FixedZone("UTC-5", -5*3600)
	transfer.Timestamp = time.Now().In(colombiaZone) // Fallback to current time in Colombia

	dateMatches := dateRegex.FindStringSubmatch(cleanText)
	if len(dateMatches) > 2 {
		datePart := strings.ToLower(strings.TrimSpace(dateMatches[1])) // "26 de junio de 2026"
		timePart := strings.ToLower(strings.TrimSpace(dateMatches[2])) // "10:46 p.m"

		// Parse the date components
		var day, year int
		var monthStr string
		_, err := fmt.Sscanf(datePart, "%d de %s de %d", &day, &monthStr, &year)
		
		if err == nil {
			monthMap := map[string]time.Month{
				"enero": time.January, "febrero": time.February, "marzo": time.March,
				"abril": time.April, "mayo": time.May, "junio": time.June,
				"julio": time.July, "agosto": time.August, "septiembre": time.September,
				"octubre": time.October, "noviembre": time.November, "diciembre": time.December,
			}
			month := monthMap[monthStr]
			
			// Parse the time components
			timePart = strings.ReplaceAll(timePart, ".", "") // remove periods from p.m or a.m
			timePart = strings.ReplaceAll(timePart, " ", "") // make it "10:46pm"
			parsedTime, tErr := time.Parse("3:04pm", timePart)
			if tErr == nil && month != 0 {
				transfer.Timestamp = time.Date(year, month, day, parsedTime.Hour(), parsedTime.Minute(), 0, 0, colombiaZone)
				fmt.Printf("[EmailParser] Fecha extraída correctamente: %v\n", transfer.Timestamp)
			}
		}
	}

	return transfer, nil
}
