import { z } from 'zod';

// Connector lookup schema
export const ConnectorLookupSchema = z.object({
	stationId: z.string().min(1, 'stationId is required'),
	connectorNo: z.number().int().positive('connectorNo must be a positive integer'),
	type: z.string().optional(),
});

// StatusNotification schema
export const StatusNotificationSchema = z.object({
	time: z.string().optional(),
	stationId: z.string().optional(),
	chargePointSerialNumber: z.string().optional(),
	connectorId: z.number().optional(),
	connector_id: z.number().optional(),
	status: z.string().min(1),
	error_code: z.string().optional(),
	info: z.string().optional(),
});

// BootNotification (Station registration) schema - updated for OCPP 1.6J
export const BootNotificationSchema = z.object({
	chargePointVendor: z.string().min(1, 'chargePointVendor is required'),
	chargePointModel: z.string().min(1, 'chargePointModel is required'),
	chargePointSerialNumber: z.string().min(1, 'chargePointSerialNumber is required'),
	chargeBoxSerialNumber: z.string().min(1, 'chargeBoxSerialNumber is required'),
	firmwareVersion: z.string().optional(),
	iccid: z.string().optional(),
	imsi: z.string().optional(),
	meterType: z.string().optional(),
	meterSerialNumber: z.string().optional(),
});


// Station update schema (if needed)
export const StationUpdateSchema = z.object({
	name: z.string().min(1).optional(),
	location: z.string().optional(),
	firmware: z.string().optional(),
});

// StartTransaction schema
export const StartTransactionSchema = z.object({
	connectorId: z.number().min(1, 'connectorId is required'),
	idTag: z.string().min(1, 'idTag is required'),
	meterStart: z.number().nonnegative('meterStart must be >= 0'),
	timestamp: z.string().min(1, 'timestamp is required'),
	stationId: z.string().optional(),
});

// StopTransaction schema
export const StopTransactionSchema = z.object({
	transactionId: z.string().min(1, 'transactionId is required'),
	meterStop: z.number().nonnegative('meterStop must be >= 0'),
	timestamp: z.string().min(1, 'timestamp is required'),
	stationId: z.string().optional(),
});

// MeterValues schema
export const MeterValuesSchema = z.object({
	transactionId: z.string().min(1, 'transactionId is required'),
	valueWh: z.number().nonnegative('valueWh must be >= 0'),
	timestamp: z.string().min(1, 'timestamp is required'),
	phase: z.string().optional(),
	stationId: z.string().optional(),
});
