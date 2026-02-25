<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const api = useApi()
const products = ref<any[]>([])
const selectedProduct = ref<any>(null)
const loading = ref(false)
const errorMessage = ref('')

const filters = reactive({ category: '', search: '' })
const newProduct = reactive({ name: '', category: '', description: '' })
const newVariant = reactive({ sku: '', price: 0, cost: 0, stock: 0, tone: '' })
const stockAdjust = reactive({ variantId: '', delta: 0, reason: '' })
const imageUpload = reactive({ productId: '', sort_order: 0 })
const imageFile = ref<File | null>(null)

async function loadProducts() {
  loading.value = true
  errorMessage.value = ''
  try {
    const params: any = {}
    if (filters.category) params.category = filters.category
    if (filters.search) params.search = filters.search
    const { data } = await api.get('/products', { params })
    products.value = data.data || []
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo cargar inventario'
  } finally {
    loading.value = false
  }
}

async function loadProductDetail(id: number) {
  const { data } = await api.get(`/products/${id}`)
  selectedProduct.value = data.data
}

async function createProduct() {
  await api.post('/products', newProduct)
  Object.assign(newProduct, { name: '', category: '', description: '' })
  await loadProducts()
}

async function createVariant() {
  if (!selectedProduct.value?.id) return
  await api.post(`/products/${selectedProduct.value.id}/variants`, newVariant)
  Object.assign(newVariant, { sku: '', price: 0, cost: 0, stock: 0, tone: '' })
  await loadProductDetail(selectedProduct.value.id)
  await loadProducts()
}

async function adjustStock() {
  await api.patch(`/variants/${stockAdjust.variantId}/stock`, {
    delta: Number(stockAdjust.delta),
    reason: stockAdjust.reason,
  })
  stockAdjust.delta = 0
  stockAdjust.reason = ''
  if (selectedProduct.value?.id) await loadProductDetail(selectedProduct.value.id)
  await loadProducts()
}

async function uploadImage() {
  if (!imageFile.value || !imageUpload.productId) return
  const fd = new FormData()
  fd.append('image', imageFile.value)
  fd.append('sort_order', String(imageUpload.sort_order))
  await api.post(`/products/${imageUpload.productId}/images`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  if (selectedProduct.value?.id) await loadProductDetail(selectedProduct.value.id)
}

onMounted(loadProducts)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Inventario</h1>
    <p v-if="errorMessage" class="rounded bg-red-50 p-3 text-sm text-red-700">{{ errorMessage }}</p>

    <div class="card">
      <div class="grid gap-3 md:grid-cols-4">
        <div><label class="label">Categoría</label><input v-model="filters.category" class="input" /></div>
        <div class="md:col-span-2"><label class="label">Buscar</label><input v-model="filters.search" class="input" /></div>
        <div class="flex items-end"><button class="btn-primary w-full" @click="loadProducts">Filtrar</button></div>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
      <div class="xl:col-span-1 space-y-4">
        <div class="card">
          <h2 class="mb-3 font-semibold">Crear producto</h2>
          <div class="space-y-3">
            <input v-model="newProduct.name" class="input" placeholder="Nombre" />
            <input v-model="newProduct.category" class="input" placeholder="Categoría" />
            <textarea v-model="newProduct.description" class="input" rows="3" placeholder="Descripción" />
            <button class="btn-primary w-full" @click="createProduct">Crear</button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>ID</th><th>Producto</th><th>Categoría</th></tr></thead>
            <tbody>
              <tr v-for="p in products" :key="p.id" class="cursor-pointer hover:bg-slate-50" @click="loadProductDetail(p.id)">
                <td>{{ p.id }}</td><td>{{ p.name }}</td><td>{{ p.category }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="xl:col-span-2 space-y-4">
        <div class="card">
          <h2 class="font-semibold">Detalle producto</h2>
          <pre class="mt-3 overflow-auto rounded bg-slate-50 p-3 text-xs">{{ selectedProduct }}</pre>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="card">
            <h3 class="mb-3 font-semibold">Crear variante</h3>
            <div class="space-y-2">
              <input v-model="newVariant.sku" class="input" placeholder="SKU" />
              <input v-model="newVariant.tone" class="input" placeholder="Tono / color" />
              <input v-model="newVariant.price" type="number" step="0.01" class="input" placeholder="Precio" />
              <input v-model="newVariant.cost" type="number" step="0.01" class="input" placeholder="Costo" />
              <input v-model="newVariant.stock" type="number" class="input" placeholder="Stock" />
              <button class="btn-primary w-full" :disabled="!selectedProduct" @click="createVariant">Crear variante</button>
            </div>
          </div>

          <div class="card">
            <h3 class="mb-3 font-semibold">Ajuste de stock</h3>
            <div class="space-y-2">
              <input v-model="stockAdjust.variantId" class="input" placeholder="Variant ID" />
              <input v-model="stockAdjust.delta" type="number" class="input" placeholder="Delta (+/-)" />
              <input v-model="stockAdjust.reason" class="input" placeholder="Motivo" />
              <button class="btn-primary w-full" @click="adjustStock">Ajustar</button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="mb-3 font-semibold">Subir imagen</h3>
          <div class="grid gap-3 md:grid-cols-4">
            <input v-model="imageUpload.productId" class="input md:col-span-1" placeholder="Product ID" />
            <input v-model="imageUpload.sort_order" class="input md:col-span-1" type="number" />
            <input class="input md:col-span-1" type="file" accept="image/*" @change="(e:any) => imageFile = e.target.files?.[0] || null" />
            <button class="btn-primary md:col-span-1" @click="uploadImage">Subir</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
