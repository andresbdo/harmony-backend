import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface ArgentinaDatosHoliday {
    fecha: string;
    nombre: string;
    tipo: string;
}

function toDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

/**
 * Feriados de Argentina, usados para correr vencimientos/cierres de tarjeta
 * al próximo día hábil cuando caen en fin de semana o feriado (igual que
 * hacen los bancos). Se cachean en DB por año; si la fuente externa falla
 * y no hay nada cacheado, se degrada a "sólo fines de semana" en vez de romper.
 */
@Injectable()
export class HolidaysService {
    private yearCache = new Map<number, Set<string>>();

    constructor(private prisma: PrismaService) { }

    async getHolidayDates(year: number): Promise<Set<string>> {
        const cached = this.yearCache.get(year);
        if (cached) return cached;

        const startOfYear = new Date(year, 0, 1);
        const startOfNextYear = new Date(year + 1, 0, 1);
        const dbRecords = await this.prisma.holiday.findMany({
            where: { date: { gte: startOfYear, lt: startOfNextYear } },
        });

        if (dbRecords.length > 0) {
            const dates = new Set(dbRecords.map((h) => toDateKey(h.date)));
            this.yearCache.set(year, dates);
            return dates;
        }

        try {
            const response = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`);
            if (!response.ok) throw new Error(`argentinadatos respondió ${response.status}`);
            const data: ArgentinaDatosHoliday[] = await response.json();

            await this.prisma.holiday.createMany({
                data: data.map((h) => ({
                    date: new Date(`${h.fecha}T00:00:00.000Z`),
                    name: h.nombre,
                    type: h.tipo,
                })),
                skipDuplicates: true,
            });

            const dates = new Set(data.map((h) => h.fecha));
            this.yearCache.set(year, dates);
            return dates;
        } catch (error) {
            console.error(`No se pudieron obtener los feriados de ${year}, usando sólo fines de semana`, error);
            const empty = new Set<string>();
            this.yearCache.set(year, empty);
            return empty;
        }
    }

    async isBusinessDay(date: Date): Promise<boolean> {
        const day = date.getDay();
        if (day === 0 || day === 6) return false;
        const holidays = await this.getHolidayDates(date.getFullYear());
        return !holidays.has(toDateKey(date));
    }

    /** Primer día hábil >= `date` (lo devuelve tal cual si ya es hábil). */
    async nextBusinessDay(date: Date): Promise<Date> {
        const result = new Date(date);
        while (!(await this.isBusinessDay(result))) {
            result.setDate(result.getDate() + 1);
        }
        return result;
    }
}
