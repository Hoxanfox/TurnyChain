// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title InvoiceNotary
 * @dev Contrato para registrar facturas de forma segura y privada en la Blockchain.
 * Solo el dueño (el backend) puede registrar nuevas facturas.
 */
contract InvoiceNotary {
    
    /**
     * @dev Evento que se emite cuando una factura es registrada.
     * - orderId: Indexado para permitir búsquedas rápidas (filtrar por ID de orden).
     * - timestamp: La fecha y hora exacta del bloque (inmutable).
     * - encryptedData: El JSON completo de la factura, encriptado (para privacidad).
     */
    event InvoiceSecured(
        string indexed orderId, 
        uint256 timestamp, 
        string encryptedData 
    );

    // Dirección del dueño del contrato (tu backend wallet)
    address public owner;

    constructor() {
        // Quien despliega el contrato se convierte en el dueño inicial
        owner = msg.sender;
    }

    // Modificador para restringir acceso solo al dueño
    modifier onlyOwner() {
        require(msg.sender == owner, "Acceso denegado: No eres el dueno");
        _;
    }

    /**
     * @dev Función principal para notariar una factura.
     * @param _orderId El UUID de la orden (ej: "a0eebc99-9c0b...").
     * @param _encryptedData El string Base64 con la data encriptada.
     */
    function notarize(string memory _orderId, string memory _encryptedData) public onlyOwner {
        // Emitimos el evento. Los logs son mucho más baratos que guardar en 'storage'.
        emit InvoiceSecured(_orderId, block.timestamp, _encryptedData);
    }
    
    /**
     * @dev Permite transferir el control del contrato a otra wallet en caso de emergencia.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "La nueva direccion no puede ser cero");
        owner = newOwner;
    }
}
