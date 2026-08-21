-- Drop old unique constraint
DROP INDEX IF EXISTS "ExchangeRate_fromCurrency_toCurrency_date_key";

-- Create new unique constraint including name
CREATE UNIQUE INDEX "ExchangeRate_fromCurrency_toCurrency_date_name_key" ON "ExchangeRate"("fromCurrency", "toCurrency", "date", "name");
