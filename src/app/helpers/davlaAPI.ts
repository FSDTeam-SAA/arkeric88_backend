// import {
//   BadGatewayException,
//   BadRequestException,
//   InternalServerErrorException,
//   NotFoundException,
//   ServiceUnavailableException,
// } from '@nestjs/common';
// import config from '../config';

// export interface VehicleResponse {
//   registrationNumber: string;
//   taxStatus: string;
//   taxDueDate: string;
//   motStatus: string;
//   motExpiryDate?: string;
//   make: string;
//   colour: string;
//   fuelType: string;
//   yearOfManufacture: number;
//   engineCapacity: number;
//   co2Emissions: number;
//   monthOfFirstRegistration: string;
//   markedForExport: boolean;
//   dateOfLastV5CIssued: string;
//   euroStatus?: string;
//   wheelplan?: string;
// }

// // ─── shared fetch logic ──────────────────────────────────────────────
// async function callDvla(
//   registrationNumber: string,
//   apiKey: string,
// ): Promise<VehicleResponse> {
//   const vrn = registrationNumber.replace(/\s/g, '').toUpperCase();

//   let response: Response;
//   try {
//     response = await fetch(config.devla.baseUrl, {
//       method: 'POST',
//       headers: {
//         'x-api-key': apiKey,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ registrationNumber: vrn }),
//     });
//   } catch {
//     throw new ServiceUnavailableException('Unable to connect to DVLA service');
//   }

//   if (!response.ok) {
//     let errorMessage = `DVLA request failed: ${response.status}`;
//     try {
//       const err = await response.json();
//       errorMessage = err?.errors?.[0]?.detail ?? errorMessage;
//     } catch {
//       const text = await response.text();
//       if (text) errorMessage = text;
//     }

//     if (response.status === 400) throw new BadRequestException(errorMessage);
//     if (response.status === 404) throw new NotFoundException(errorMessage);
//     if (response.status === 401 || response.status === 403)
//       throw new BadGatewayException('DVLA API authentication failed');

//     throw new BadGatewayException(errorMessage);
//   }

//   return response.json() as Promise<VehicleResponse>;
// }

// // ─── FREE DVLA ───────────────────────────────────────────────────────
// export async function freeDVLACarCheck(
//   registrationNumber: string,
// ): Promise<VehicleResponse> {
//   const apiKey = config.devla.freeDevialKey;
//   if (!apiKey)
//     throw new InternalServerErrorException('FREE DVLA API key missing');
//   return callDvla(registrationNumber, apiKey);
// }

// // ─── PAID DVLA ───────────────────────────────────────────────────────
// export async function paidDVLACarCheck(
//   registrationNumber: string,
// ): Promise<VehicleResponse> {
//   const apiKey = config.devla.paidDevialKey;
//   if (!apiKey)
//     throw new InternalServerErrorException('PAID DVLA API key missing');
//   return callDvla(registrationNumber, apiKey);
// }

// // ─── backward compat (পুরনো import ভাঙবে না) ────────────────────────
// export const freeDvlaApi = freeDVLACarCheck;
