
# Harmony Finance – Product Requirements

## Visión
Harmony Finance es una aplicación de finanzas personales y compartidas que permite a los usuarios gestionar gastos, ingresos, presupuestos, ahorros y finanzas familiares desde un único lugar.

El foco está en:
- Claridad
- Control
- Transparencia
- Experiencia fintech moderna

---

## Principios de Diseño
- Mobile-first
- Minimalista
- Fintech premium (Patreon / Revolut / N26)
- No contable
- Información clara en segundos
- Todo tiene fecha, categoría y contexto

---

## Usuario y Onboarding

### Registro
- Email
- Nombre
- Password
- Selección de moneda principal (obligatoria)

### Perfil Personal
- Todo usuario tiene un perfil personal base
- El balance personal se compone de:
  - Cuentas
  - Tarjetas
  - Workspaces

---

## Dashboard Principal

### Contenido
- Saldo total consolidado
- Indicador de dinero gastable
- Relación entre:
  - Ingresos
  - Presupuesto
  - Ahorro
- Quick actions:
  - Agregar gasto
  - Agregar ingreso
  - Crear workspace

### Widgets
- Calendario de vencimientos
- Últimos gastos
- Cuentas y tarjetas
- Presupuesto y ahorro

---

## Gastos

### Tipos
- Fijos (mensuales / recurrentes)
- Eventuales

### Métodos de pago
- Tarjeta (requiere tarjeta asociada)
- Cuenta bancaria
- Efectivo

### Atributos
- Monto
- Moneda
- Categoría
- Fecha
- Quién pagó
- Workspace asociado (opcional)

---

## Cuentas y Tarjetas

### Cuentas
- Banco
- Moneda
- Saldo

### Tarjetas
- Asociadas a cuentas
- Fecha de cierre
- Fecha de vencimiento

---

## Presupuesto y Ahorro

### Presupuesto
- Presupuesto general
- Presupuesto por categoría

### Ahorro
- Monto definido por el usuario
- Reduce el dinero disponible para gastar

---

## Workspaces

### Concepto
- Espacios compartidos (hogar, pareja, roommates)
- Impactan en el balance personal

### Características
- Usuarios invitados
- Porcentaje de gasto por usuario
- Categorías propias
- Fecha de corte configurable

---

## Cierre de Mes

- Se toman todos los gastos
- Se aplican porcentajes
- Se compensan pagos
- Se determina quién debe a quién
- Se genera un resumen mensual

---

## Reglas Clave
- Todo gasto tiene fecha
- Todo gasto tiene método de pago
- Todo impacto financiero se refleja en el balance personal
- El dashboard personal muestra todo, incluso de workspaces

---

## Futuro (fuera del MVP)
- Integración bancaria
- Exportaciones
- Reportes avanzados
- IA de insights
