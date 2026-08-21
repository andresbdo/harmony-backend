import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface ExchangeRateResponse {
  name: string;
  compra: number;
  venta: number;
}

@Injectable()
export class ExchangeRatesService {
  constructor(private prisma: PrismaService) {}

  async getLatest(): Promise<ExchangeRateResponse[]> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const cachedRecords = await this.prisma.exchangeRate.findMany({
      where: {
        fromCurrency: 'USD',
        toCurrency: 'ARS',
        date: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
    });

    if (cachedRecords.length > 0) {
      return cachedRecords.map((record) => ({
        name: record.name ?? record.fromCurrency,
        compra: record.compra ?? Number(record.rate),
        venta: Number(record.rate),
      }));
    }

    try {
      const response = await fetch('https://dolarapi.com/v1/dolares');

      if (!response.ok) {
        throw new ServiceUnavailableException(`dolarapi responded with status ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new ServiceUnavailableException('Invalid response format from dolarapi');
      }

      const exchangeRatesToCreate = data.map((item: any) => ({
        fromCurrency: 'USD',
        toCurrency: 'ARS',
        rate: item.venta,
        name: item.nombre,
        compra: item.compra,
        date: new Date(),
      }));

      await this.prisma.exchangeRate.createMany({
        data: exchangeRatesToCreate,
        skipDuplicates: true,
      });

      return data.map((item: any) => ({
        name: item.nombre,
        compra: item.compra,
        venta: item.venta,
      }));
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const fallbackRecords = await this.prisma.exchangeRate.findMany({
        where: {
          fromCurrency: 'USD',
          toCurrency: 'ARS',
        },
        orderBy: {
          date: 'desc',
        },
        take: 20,
      });

      if (fallbackRecords.length === 0) {
        throw new ServiceUnavailableException('Unable to fetch exchange rates and no cached data available');
      }

      return fallbackRecords.map((record) => ({
        name: record.name ?? record.fromCurrency,
        compra: record.compra ?? Number(record.rate),
        venta: Number(record.rate),
      }));
    }
  }
}
