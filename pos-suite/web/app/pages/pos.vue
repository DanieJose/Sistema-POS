<script setup lang="ts">
definePageMeta({ layout: 'admin' })

type SearchVariantResult = {
  product_id: number
  product_name: string
  category: string
  variant_id: number
  sku: string
  price: number
  stock: number
}

type CartItem = {
  variant_id: number
  product_id: number
  name: string
  sku: string
  price: number
  stock: number
  quantity: number
  line_discount_amount: number
}

type CustomerRow = {
  id: number
  full_name: string
  phone: string
  email?: string | null
}

type PaymentRow = {
  method: 'cash' | 'card' | 'transfer' | 'points'
  amount_lempiras?: number
  points_used?: number
  reference?: string
}

const api = useApi()
const auth = useAuthStore()
const runtimeConfig = useRuntimeConfig()
const router = useRouter()

const skuSearch = ref('')
const productResults = ref<SearchVariantResult[]>([])
const productsLoading = ref(false)

const cart = ref<CartItem[]>([])
const globalDiscount = ref(0)

const customerSearch = ref('')
const customerResults = ref<CustomerRow[]>([])
const customersLoading = ref(false)
const selectedCustomer = ref<CustomerRow | null>(null)
const customerWallet = ref<any | null>(null)
const walletLoading = ref(false)

const issueInvoice = ref(false)
const paymentMode = ref<'cash' | 'card' | 'transfer' | 'points' | 'mixed'>('cash')
const payments = ref<PaymentRow[]>([{ method: 'cash', amount_lempiras: 0 }])
const redeemQuote = ref<any | null>(null)
const redeemQuoteLoading = ref(false)

const cashSession = ref<any | null>(null)
const cashLoading = ref(false)
const showOpenCashModal = ref(false)
const openingCashAmount = ref<number>(0)
const openingCashLoading = ref(false)

const storeSettings = ref<any | null>(null)

const submitting = ref(false)
const loadingInitial = ref(true)
const errorMessage = ref('')
const successMessage = ref('')
const checkoutResult = ref<any | null>(null)
const showCheckoutModal = ref(false)

const isCashier = computed(() => auth.role === 'CASHIER')
const canApplyLineDiscount = computed(() => auth.role === 'ADMIN' || auth.role === 'SUPERVISOR')
const canOpenCash = computed(() => ['ADMIN', 'SUPERVISOR', 'CASHIER'].includes(auth.role))
const hasOpenCash = computed(() => Boolean(cashSession.value))

function toNumber(value: any, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function round2(value: number) {
  return Number(value.toFixed(2))
}

function money(value: any) {
  return `L ${toNumber(value).toFixed(2)}`
}

function normalizeRate(value: any) {
  const n = toNumber(value, 0)
  return n > 1 ? n / 100 : n
}

const loyaltyPointValue = computed(() => toNumber(storeSettings.value?.loyalty_point_value, 1))
const cardSurchargeRate = computed(() => normalizeRate(storeSettings.value?.card_surcharge_rate ?? 0))
const isvRate = computed(() => normalizeRate(storeSettings.value?.isv_rate ?? 0.15))
const pricesIncludeIsv = computed(() => Boolean(storeSettings.value?.prices_include_isv ?? true))

const subtotal = computed(() =>
  round2(
    cart.value.reduce((sum, item) => sum + toNumber(item.price) * toNumber(item.quantity), 0),
  ),
)

const lineDiscountTotal = computed(() =>
  round2(cart.value.reduce((sum, item) => sum + toNumber(item.line_discount_amount), 0)),
)

const discountTotal = computed(() => round2(lineDiscountTotal.value + toNumber(globalDiscount.value)))

const previewCardAmount = computed(() =>
  round2(
    payments.value
      .filter((p) => p.method === 'card')
      .reduce((sum, p) => sum + toNumber(p.amount_lempiras), 0),
  ),
)

const surchargeTotal = computed(() => round2(previewCardAmount.value * cardSurchargeRate.value))

const baseAfterDiscount = computed(() => round2(Math.max(0, subtotal.value - discountTotal.value)))

const taxTotal = computed(() => {
  if (pricesIncludeIsv.value) {
    const totalWithSurcharge = round2(baseAfterDiscount.value + surchargeTotal.value)
    return round2(totalWithSurcharge * (isvRate.value / (1 + isvRate.value)))
  }
  return round2((baseAfterDiscount.value + surchargeTotal.value) * isvRate.value)
})

const total = computed(() => {
  if (pricesIncludeIsv.value) return round2(baseAfterDiscount.value + surchargeTotal.value)
  return round2(baseAfterDiscount.value + surchargeTotal.value + taxTotal.value)
})

const pointsPaymentRow = computed(() => payments.value.find((p) => p.method === 'points') || null)
const pointsUsedInput = computed(() => toNumber(pointsPaymentRow.value?.points_used, 0))
const pointsEquivalent = computed(() => round2(pointsUsedInput.value * loyaltyPointValue.value))
const moneyPaidTotal = computed(() =>
  round2(
    payments.value
      .filter((p) => p.method !== 'points')
      .reduce((sum, p) => sum + toNumber(p.amount_lempiras), 0),
  ),
)
const paymentAppliedTotal = computed(() => round2(moneyPaidTotal.value + pointsEquivalent.value))
const paymentDelta = computed(() => round2(total.value - paymentAppliedTotal.value))

const canCheckout = computed(() => cart.value.length > 0 && hasOpenCash.value && !submitting.value)

function resetMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function ensureAuthToken() {
  if (auth.token) return true
  if (process.client) auth.hydrateFromStorage()
  if (auth.token) return true
  router.push('/login')
  return false
}

function resolveApiData(response: any) {
  return response?.data?.data ?? response?.data
}

function invoicePdfHref(invoice: any) {
  if (!invoice?.pdf_url) return null
  if (String(invoice.pdf_url).startsWith('http')) return invoice.pdf_url
  const apiBase = String(runtimeConfig.public.apiBaseUrl || '').replace(/\/api\/?$/, '')
  return `${apiBase}${invoice.pdf_url}`
}

async function loadStoreSettings() {
  try {
    const res = await api.get('/store-settings')
    storeSettings.value = resolveApiData(res)
  } catch {
    storeSettings.value = null
  }
}

async function loadCurrentCashSession() {
  cashLoading.value = true
  try {
    const res = await api.get('/cash/current')
    cashSession.value = resolveApiData(res)
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo validar caja'
  } finally {
    cashLoading.value = false
  }
}

async function initializePos() {
  loadingInitial.value = true
  resetMessages()
  await Promise.all([loadStoreSettings(), loadCurrentCashSession()])
  loadingInitial.value = false
}

function setPaymentMode(mode: typeof paymentMode.value) {
  paymentMode.value = mode
  redeemQuote.value = null
  if (mode === 'mixed') {
    payments.value = [
      { method: 'cash', amount_lempiras: 0 },
      { method: 'card', amount_lempiras: 0 },
    ]
    return
  }
  if (mode === 'points') {
    payments.value = [{ method: 'points', points_used: 0 }]
    return
  }
  payments.value = [{ method: mode, amount_lempiras: 0 }]
}

function addPaymentRow() {
  payments.value.push({ method: 'cash', amount_lempiras: 0 })
}

function removePaymentRow(index: number) {
  if (payments.value.length === 1) return
  payments.value.splice(index, 1)
  redeemQuote.value = null
}

async function searchProducts() {
  resetMessages()
  productResults.value = []
  if (!ensureAuthToken()) return
  const q = skuSearch.value.trim()
  if (!q) return

  productsLoading.value = true
  const requestPath = '/products'
  const fullUrl = `${String(runtimeConfig.public.apiBaseUrl || '').replace(/\/$/, '')}${requestPath}`
  try {
    const listRes = await api.get(requestPath, { params: { search: q, is_active: true } })
    const products = resolveApiData(listRes) || []
    const details = await Promise.all(
      products.slice(0, 20).map((product: any) => api.get(`/products/${product.id}`)),
    )

    const query = q.toLowerCase()
    const rows: SearchVariantResult[] = []
    for (const detailRes of details) {
      const product = resolveApiData(detailRes)
      const variants = Array.isArray(product?.variants) ? product.variants : []
      for (const variant of variants) {
        const matchesSku = String(variant.sku || '').toLowerCase().includes(query)
        const matchesName = String(product.name || '').toLowerCase().includes(query)
        if (!matchesSku && !matchesName) continue
        rows.push({
          product_id: product.id,
          product_name: product.name,
          category: product.category,
          variant_id: Number(variant.id),
          sku: String(variant.sku || ''),
          price: toNumber(variant.price),
          stock: toNumber(variant.stock),
        })
      }
    }

    productResults.value = rows.sort((a, b) => a.product_name.localeCompare(b.product_name))
    if (!productResults.value.length) errorMessage.value = 'No se encontraron productos/variantes'
  } catch (error: any) {
    console.error('POS searchProducts error', error)
    const status = error?.response?.status
    const backendPayload = error?.response?.data
    const backendMessage =
      typeof backendPayload === 'string'
        ? backendPayload
        : backendPayload
          ? JSON.stringify(backendPayload)
          : (error?.message || 'Error al buscar productos')
    errorMessage.value = [
      'Error al buscar productos',
      status ? `Status: ${status}` : null,
      `URL: ${fullUrl}`,
      `Backend: ${backendMessage}`,
    ]
      .filter(Boolean)
      .join(' | ')
  } finally {
    productsLoading.value = false
  }
}

function addToCart(row: SearchVariantResult) {
  resetMessages()
  const existing = cart.value.find((item) => item.variant_id === row.variant_id)
  if (existing) {
    if (existing.quantity + 1 > row.stock) {
      errorMessage.value = `Stock insuficiente para ${row.sku}`
      return
    }
    existing.quantity += 1
    return
  }

  cart.value.push({
    variant_id: row.variant_id,
    product_id: row.product_id,
    name: row.product_name,
    sku: row.sku,
    price: row.price,
    stock: row.stock,
    quantity: 1,
    line_discount_amount: 0,
  })
}

function incrementQty(item: CartItem) {
  if (item.quantity + 1 > item.stock) {
    errorMessage.value = `Stock insuficiente para ${item.sku}`
    return
  }
  item.quantity += 1
}

function decrementQty(item: CartItem) {
  if (item.quantity <= 1) return
  item.quantity -= 1
}

function removeCartItem(variantId: number) {
  cart.value = cart.value.filter((item) => item.variant_id !== variantId)
}

function clampLineDiscount(item: CartItem) {
  const max = round2(item.price * item.quantity)
  if (item.line_discount_amount < 0) item.line_discount_amount = 0
  if (item.line_discount_amount > max) item.line_discount_amount = max
}

async function searchCustomers() {
  resetMessages()
  customerResults.value = []
  const q = customerSearch.value.trim()
  if (!q) return
  customersLoading.value = true
  try {
    const [byName, byPhone] = await Promise.all([
      api.get('/customers', { params: { name: q } }),
      api.get('/customers', { params: { phone: q } }),
    ])
    const merged = [...(resolveApiData(byName) || []), ...(resolveApiData(byPhone) || [])] as CustomerRow[]
    const unique = new Map<number, CustomerRow>()
    for (const row of merged) unique.set(Number(row.id), row)
    customerResults.value = Array.from(unique.values())
    if (!customerResults.value.length) errorMessage.value = 'No se encontraron clientes'
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Error al buscar clientes'
  } finally {
    customersLoading.value = false
  }
}

async function selectCustomer(customer: CustomerRow) {
  selectedCustomer.value = customer
  redeemQuote.value = null
  await loadWallet(customer.id)
}

async function loadWallet(customerId: number) {
  walletLoading.value = true
  try {
    const res = await api.get(`/customers/${customerId}/wallet`)
    customerWallet.value = resolveApiData(res)
  } catch (error: any) {
    customerWallet.value = null
    errorMessage.value = error?.response?.data?.message || 'No se pudo cargar wallet'
  } finally {
    walletLoading.value = false
  }
}

function clearCustomerSelection() {
  selectedCustomer.value = null
  customerWallet.value = null
  redeemQuote.value = null
}

async function calculateRedeemQuote() {
  resetMessages()
  redeemQuote.value = null
  const pointsRow = pointsPaymentRow.value
  if (!selectedCustomer.value) {
    errorMessage.value = 'Seleccione un cliente para usar puntos'
    return
  }
  if (!pointsRow || toNumber(pointsRow.points_used) <= 0) {
    errorMessage.value = 'Ingrese puntos a usar'
    return
  }
  redeemQuoteLoading.value = true
  try {
    const res = await api.post('/loyalty/redeem-quote', {
      customer_id: selectedCustomer.value.id,
      sale_total_lempiras: total.value,
      points_to_use: toNumber(pointsRow.points_used),
    })
    redeemQuote.value = resolveApiData(res)
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo calcular canje'
  } finally {
    redeemQuoteLoading.value = false
  }
}

async function openCash() {
  resetMessages()
  openingCashLoading.value = true
  try {
    const res = await api.post('/cash/open', {
      opening_cash_amount: toNumber(openingCashAmount.value),
    })
    cashSession.value = resolveApiData(res)
    showOpenCashModal.value = false
    successMessage.value = 'Caja abierta correctamente'
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo abrir caja'
  } finally {
    openingCashLoading.value = false
  }
}

function buildPaymentsPayload() {
  return payments.value
    .map((payment) => {
      if (payment.method === 'points') {
        return {
          method: 'points',
          points_used: toNumber(payment.points_used),
        }
      }
      return {
        method: payment.method,
        amount_lempiras: toNumber(payment.amount_lempiras),
        reference: payment.method === 'transfer' ? (payment.reference || '').trim() || undefined : undefined,
      }
    })
    .filter((payment) => {
      if (payment.method === 'points') return toNumber((payment as any).points_used) > 0
      return toNumber((payment as any).amount_lempiras) > 0
    })
}

async function checkout() {
  resetMessages()
  checkoutResult.value = null

  if (!hasOpenCash.value) {
    errorMessage.value = 'Debe abrir caja'
    return
  }
  if (!cart.value.length) {
    errorMessage.value = 'Agregue productos al carrito'
    return
  }

  const payloadPayments = buildPaymentsPayload()
  if (!payloadPayments.length) {
    errorMessage.value = 'Ingrese al menos un pago'
    return
  }

  submitting.value = true
  try {
    const payload: any = {
      items: cart.value.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        ...(toNumber(item.line_discount_amount) > 0
          ? { line_discount_amount: toNumber(item.line_discount_amount) }
          : {}),
      })),
      payments: payloadPayments,
      issue_invoice: issueInvoice.value,
      ...(toNumber(globalDiscount.value) > 0 ? { sale_discount_total: toNumber(globalDiscount.value) } : {}),
    }
    if (selectedCustomer.value) payload.customer_id = selectedCustomer.value.id

    const res = await api.post('/sales', payload)
    checkoutResult.value = res.data
    showCheckoutModal.value = true
    successMessage.value = 'Venta registrada correctamente'

    cart.value = []
    globalDiscount.value = 0
    setPaymentMode('cash')
    redeemQuote.value = null
    await Promise.all([
      loadCurrentCashSession(),
      selectedCustomer.value ? loadWallet(selectedCustomer.value.id) : Promise.resolve(),
    ])
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo procesar la venta'
  } finally {
    submitting.value = false
  }
}

function fillCashToTotal() {
  const row = payments.value.find((p) => p.method === 'cash')
  if (!row) return
  row.amount_lempiras = Math.max(0, round2(total.value - (paymentAppliedTotal.value - toNumber(row.amount_lempiras))))
}

watch(paymentMode, (mode) => {
  if (mode === 'mixed' && payments.value.length < 2) setPaymentMode('mixed')
})

onMounted(async () => {
  await initializePos()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">POS - Venta rápida</h1>
        <p class="text-sm text-slate-500">Venta en caja con efectivo, tarjeta, transferencia y puntos</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-secondary" :disabled="loadingInitial" @click="initializePos">
          {{ loadingInitial ? 'Cargando...' : 'Recargar datos' }}
        </button>
        <button
          v-if="canOpenCash && !hasOpenCash"
          class="btn-primary"
          :disabled="cashLoading"
          @click="showOpenCashModal = true"
        >
          Abrir caja
        </button>
      </div>
    </div>

    <div v-if="successMessage" class="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
      {{ successMessage }}
    </div>
    <div v-if="errorMessage" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div class="rounded-md border p-3 text-sm" :class="hasOpenCash ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span class="font-medium">Caja:</span>
          <span v-if="cashLoading"> validando...</span>
          <span v-else-if="hasOpenCash">
            abierta (sesión #{{ cashSession?.id }}) - apertura {{ money(cashSession?.opening_cash_amount) }}
          </span>
          <span v-else>Debe abrir caja para cobrar.</span>
        </div>
        <button v-if="canOpenCash && !hasOpenCash" class="btn-secondary" @click="showOpenCashModal = true">
          Abrir caja
        </button>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-12">
      <section class="space-y-4 xl:col-span-4">
        <div class="card space-y-3">
          <h2 class="font-semibold">Buscar producto / variante</h2>
          <div class="flex gap-2">
            <input
              v-model="skuSearch"
              class="input"
              placeholder="Buscar por SKU o nombre"
              @keyup.enter="searchProducts"
            />
            <button class="btn-secondary whitespace-nowrap" :disabled="productsLoading" @click="searchProducts">
              {{ productsLoading ? 'Buscando...' : 'Buscar' }}
            </button>
          </div>

          <div class="max-h-[420px] space-y-2 overflow-auto pr-1">
            <div v-if="!productResults.length && !productsLoading" class="text-sm text-slate-500">
              Sin resultados. Busca por SKU o nombre.
            </div>
            <div
              v-for="row in productResults"
              :key="`${row.product_id}-${row.variant_id}`"
              class="rounded border p-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ row.product_name }}</p>
                  <p class="text-xs text-slate-500">{{ row.category }}</p>
                  <p class="mt-1 text-sm text-slate-700">SKU: {{ row.sku }}</p>
                  <p class="text-sm text-slate-700">
                    {{ money(row.price) }} · Stock: {{ row.stock }}
                  </p>
                </div>
                <button class="btn-primary" :disabled="row.stock <= 0" @click="addToCart(row)">
                  {{ row.stock <= 0 ? 'Sin stock' : 'Agregar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-4 xl:col-span-5">
        <div class="card">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h2 class="font-semibold">Carrito</h2>
            <button v-if="cart.length" class="btn-secondary" @click="cart = []">Vaciar</button>
          </div>

          <div v-if="!cart.length" class="text-sm text-slate-500">No hay items en el carrito.</div>

          <div v-else class="space-y-3">
            <div
              v-for="item in cart"
              :key="item.variant_id"
              class="grid gap-2 rounded border p-3 md:grid-cols-[1fr_auto_auto_auto_auto]"
            >
              <div class="min-w-0">
                <p class="truncate font-medium">{{ item.name }}</p>
                <p class="text-xs text-slate-500">{{ item.sku }}</p>
                <p class="text-xs text-slate-500">Stock disp.: {{ item.stock }}</p>
              </div>

              <div class="flex items-center gap-1">
                <button class="btn-secondary px-2 py-1" @click="decrementQty(item)">-</button>
                <span class="w-8 text-center">{{ item.quantity }}</span>
                <button class="btn-secondary px-2 py-1" @click="incrementQty(item)">+</button>
              </div>

              <div class="text-right text-sm">
                <p>{{ money(item.price) }}</p>
                <p class="text-xs text-slate-500">unit.</p>
              </div>

              <div v-if="canApplyLineDiscount" class="w-28">
                <input
                  v-model.number="item.line_discount_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input text-right"
                  placeholder="Desc. L"
                  @change="clampLineDiscount(item)"
                />
              </div>
              <div v-else class="w-28 text-right text-sm text-slate-500">Sin desc.</div>

              <div class="flex items-center justify-end gap-2">
                <span class="w-24 text-right font-semibold">
                  {{ money(item.quantity * item.price - item.line_discount_amount) }}
                </span>
                <button class="btn-secondary" @click="removeCartItem(item.variant_id)">Eliminar</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card space-y-3">
          <h2 class="font-semibold">Resumen</h2>

          <div v-if="canApplyLineDiscount" class="grid gap-2 md:grid-cols-2">
            <label class="text-sm text-slate-600">Descuento global (L)</label>
            <input v-model.number="globalDiscount" type="number" min="0" step="0.01" class="input text-right" />
          </div>

          <div class="space-y-1 text-sm">
            <div class="flex justify-between"><span>Subtotal</span><span>{{ money(subtotal) }}</span></div>
            <div class="flex justify-between"><span>Descuento total</span><span>{{ money(discountTotal) }}</span></div>
            <div class="flex justify-between"><span>Recargo tarjeta</span><span>{{ money(surchargeTotal) }}</span></div>
            <div class="flex justify-between"><span>ISV</span><span>{{ money(taxTotal) }}</span></div>
            <div class="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span><span>{{ money(total) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-4 xl:col-span-3">
        <div class="card space-y-3">
          <h2 class="font-semibold">Cliente</h2>
          <div class="flex gap-2">
            <input
              v-model="customerSearch"
              class="input"
              placeholder="Buscar por teléfono o nombre"
              @keyup.enter="searchCustomers"
            />
            <button class="btn-secondary whitespace-nowrap" :disabled="customersLoading" @click="searchCustomers">
              {{ customersLoading ? 'Buscando...' : 'Buscar' }}
            </button>
          </div>

          <div v-if="selectedCustomer" class="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-medium">{{ selectedCustomer.full_name }}</p>
                <p class="text-slate-600">{{ selectedCustomer.phone }}</p>
                <p class="text-slate-600">
                  Puntos:
                  <span v-if="walletLoading">cargando...</span>
                  <span v-else>{{ customerWallet?.balance_points ?? 0 }}</span>
                </p>
              </div>
              <button class="btn-secondary" @click="clearCustomerSelection">Quitar</button>
            </div>
          </div>

          <div v-if="customerResults.length" class="max-h-40 space-y-2 overflow-auto pr-1">
            <button
              v-for="customer in customerResults"
              :key="customer.id"
              class="w-full rounded border p-2 text-left hover:bg-slate-50"
              @click="selectCustomer(customer)"
            >
              <p class="font-medium">{{ customer.full_name }}</p>
              <p class="text-xs text-slate-500">{{ customer.phone }}</p>
            </button>
          </div>
        </div>

        <div class="card space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">Pago / Checkout</h2>
            <label class="inline-flex items-center gap-2 text-sm">
              <input v-model="issueInvoice" type="checkbox" />
              Emitir factura
            </label>
          </div>

          <div class="space-y-2">
            <label class="text-sm text-slate-600">Modo de pago</label>
            <select v-model="paymentMode" class="input" @change="setPaymentMode(paymentMode)">
              <option value="cash">efectivo</option>
              <option value="card">tarjeta</option>
              <option value="transfer">transferencia</option>
              <option value="points">puntos</option>
              <option value="mixed">mixto</option>
            </select>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-medium">Pagos</h3>
              <button v-if="paymentMode === 'mixed'" class="btn-secondary" @click="addPaymentRow">+ línea</button>
            </div>

            <div
              v-for="(payment, index) in payments"
              :key="index"
              class="space-y-2 rounded border p-2"
            >
              <div class="flex items-center gap-2">
                <select v-model="payment.method" class="input">
                  <option value="cash">cash</option>
                  <option value="card">card</option>
                  <option value="transfer">transfer</option>
                  <option value="points">points</option>
                </select>
                <button v-if="paymentMode === 'mixed'" class="btn-secondary" @click="removePaymentRow(index)">
                  Quitar
                </button>
              </div>

              <input
                v-if="payment.method !== 'points'"
                v-model.number="payment.amount_lempiras"
                type="number"
                min="0"
                step="0.01"
                class="input"
                placeholder="Monto en Lempiras"
              />

              <div v-else class="space-y-2">
                <input
                  v-model.number="payment.points_used"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input"
                  placeholder="Puntos a usar"
                />
                <button class="btn-secondary w-full" :disabled="redeemQuoteLoading" @click="calculateRedeemQuote">
                  {{ redeemQuoteLoading ? 'Calculando...' : 'Calcular puntos' }}
                </button>
                <div v-if="redeemQuote" class="rounded bg-slate-50 p-2 text-xs">
                  <p>Aprobado: {{ redeemQuote.points_approved }}</p>
                  <p>Descuento: {{ money(redeemQuote.lempiras_discount) }}</p>
                  <p>Restante: {{ money(redeemQuote.remaining_to_pay) }}</p>
                </div>
              </div>

              <input
                v-if="payment.method === 'transfer'"
                v-model="payment.reference"
                class="input"
                placeholder="Referencia transferencia"
              />
            </div>
          </div>

          <div class="rounded bg-slate-50 p-3 text-sm">
            <div class="flex justify-between">
              <span>Pagado (preview)</span>
              <span>{{ money(paymentAppliedTotal) }}</span>
            </div>
            <div class="mt-1 flex justify-between">
              <span>Diferencia</span>
              <span :class="Math.abs(paymentDelta) <= 0.01 ? 'text-emerald-700' : 'text-amber-700'">
                {{ money(paymentDelta) }}
              </span>
            </div>
            <button class="btn-secondary mt-2 w-full" @click="fillCashToTotal">Completar efectivo al total</button>
          </div>

          <button
            class="btn-primary w-full"
            :disabled="!canCheckout"
            @click="checkout"
          >
            {{ submitting ? 'Cobrando...' : hasOpenCash ? 'Cobrar' : 'Debe abrir caja' }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="showOpenCashModal" class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold">Abrir caja</h2>
          <button class="btn-secondary" @click="showOpenCashModal = false">Cerrar</button>
        </div>
        <label class="text-sm text-slate-600">Monto inicial</label>
        <input
          v-model.number="openingCashAmount"
          type="number"
          min="0"
          step="0.01"
          class="input mt-2"
          placeholder="0.00"
        />
        <button class="btn-primary mt-4 w-full" :disabled="openingCashLoading" @click="openCash">
          {{ openingCashLoading ? 'Abriendo...' : 'Confirmar apertura' }}
        </button>
      </div>
    </div>

    <div v-if="showCheckoutModal" class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div class="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold">Venta completada</h2>
          <button class="btn-secondary" @click="showCheckoutModal = false">Cerrar</button>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div class="rounded border p-3">
            <p class="text-sm text-slate-500">N° venta</p>
            <p class="text-lg font-semibold">{{ checkoutResult?.data?.sale_number || checkoutResult?.data?.data?.sale_number }}</p>
          </div>
          <div class="rounded border p-3">
            <p class="text-sm text-slate-500">Total</p>
            <p class="text-lg font-semibold">
              {{ money(checkoutResult?.data?.total || checkoutResult?.data?.data?.total) }}
            </p>
          </div>
        </div>

        <div v-if="checkoutResult?.data?.invoice || checkoutResult?.invoice" class="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p class="font-medium">Factura emitida</p>
          <p>
            Número:
            {{ checkoutResult?.invoice?.invoice_number || checkoutResult?.data?.invoice?.invoice_number }}
          </p>
          <a
            class="mt-2 inline-block text-emerald-700 underline"
            :href="invoicePdfHref(checkoutResult?.invoice || checkoutResult?.data?.invoice)"
            target="_blank"
          >
            Ver PDF
          </a>
        </div>

        <pre class="mt-4 max-h-64 overflow-auto rounded bg-slate-50 p-3 text-xs">{{ checkoutResult }}</pre>
      </div>
    </div>
  </div>
</template>
