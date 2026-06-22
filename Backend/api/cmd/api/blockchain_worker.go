package main

import (
	"log"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
)

func StartBlockchainWorker(orderRepo repository.OrderRepository, bc service.BlockchainService) {
	if bc == nil {
		log.Println("⚠️ BlockchainService es nil. El worker de notarización no se iniciará.")
		return
	}

	ticker := time.NewTicker(5 * time.Minute)
	cooldown := 1 * time.Hour

	go func() {
		log.Println("⚙️ BlockchainWorker iniciado: Notarizará órdenes pagadas tras 1 hora de cooldown.")
		for {
			<-ticker.C
			
			// Obtener órdenes que llevan pagadas al menos 1 hora y no han sido notarizadas
			orders, err := orderRepo.GetPendingBlockchainOrders(cooldown)
			if err != nil {
				log.Printf("❌ [BlockchainWorker] Error al obtener órdenes pendientes: %v", err)
				continue
			}

			if len(orders) > 0 {
				log.Printf("🔍 [BlockchainWorker] Encontradas %d órdenes pendientes de notarización.", len(orders))
			}

			for _, ord := range orders {
				// No necesitamos goroutines adicionales aquí, la notarización en lote puede ser secuencial
				// para evitar spam a la blockchain (o podríamos hacerlo paralelo).
				log.Printf("⏳ [BlockchainWorker] Notarizando orden %s...", ord.ID)
				
				txHash, err := bc.NotarizeOrder(&ord)
				if err != nil {
					log.Printf("❌ [BlockchainWorker] Error notarizando orden %s: %v", ord.ID, err)
					continue
				}

				if updateErr := orderRepo.UpdateOrderBlockchainTxHash(ord.ID, txHash); updateErr != nil {
					log.Printf("⚠️ [BlockchainWorker] No se pudo guardar hash para orden %s: %v", ord.ID, updateErr)
				} else {
					log.Printf("✅ [BlockchainWorker] Orden %s notarizada exitosamente. Hash: %s", ord.ID, txHash)
				}
			}
		}
	}()
}
