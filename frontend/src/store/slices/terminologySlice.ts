import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// Types
export interface TerminologyState {
  terms: TerminologyEntry[]
  categories: TerminologyCategory[]
  isLoading: boolean
  searchQuery: string
  selectedCategory: string | null
  error: string | null
}

export interface TerminologyEntry {
  id: string
  sourceText: string
  targetText: string
  category: string
  domain: string
  confidence: number
  frequency: number
  context: string[]
  notes: string
  createdAt: number
  updatedAt: number
  verified: boolean
}

export interface TerminologyCategory {
  id: string
  name: string
  description: string
  color: string
  termCount: number
}

// Initial state
const initialState: TerminologyState = {
  terms: [
    // PXI 模块相关术语
    {
      id: '1',
      sourceText: 'PXI Module',
      targetText: 'PXI模块',
      category: 'hardware',
      domain: 'pxi',
      confidence: 0.98,
      frequency: 150,
      context: ['PXI module configuration', 'module installation'],
      notes: 'PXI (PCI eXtensions for Instrumentation) 模块',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
      verified: true,
    },
    {
      id: '2',
      sourceText: 'Data Acquisition',
      targetText: '数据采集',
      category: 'function',
      domain: 'measurement',
      confidence: 0.99,
      frequency: 200,
      context: ['data acquisition system', 'real-time data acquisition'],
      notes: '实时数据采集系统的核心功能',
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 172800000,
      verified: true,
    },
    {
      id: '3',
      sourceText: 'Test Measurement',
      targetText: '测试测量',
      category: 'function',
      domain: 'measurement',
      confidence: 0.97,
      frequency: 180,
      context: ['automated test measurement', 'precision measurement'],
      notes: '自动化测试测量系统',
      createdAt: Date.now() - 259200000,
      updatedAt: Date.now() - 259200000,
      verified: true,
    },
    {
      id: '4',
      sourceText: 'Signal Conditioning',
      targetText: '信号调理',
      category: 'process',
      domain: 'signal',
      confidence: 0.96,
      frequency: 120,
      context: ['signal conditioning module', 'analog signal conditioning'],
      notes: '模拟信号调理和处理',
      createdAt: Date.now() - 345600000,
      updatedAt: Date.now() - 345600000,
      verified: true,
    },
    {
      id: '5',
      sourceText: 'Chassis',
      targetText: '机箱',
      category: 'hardware',
      domain: 'pxi',
      confidence: 0.99,
      frequency: 90,
      context: ['PXI chassis', 'modular chassis system'],
      notes: 'PXI模块化机箱系统',
      createdAt: Date.now() - 432000000,
      updatedAt: Date.now() - 432000000,
      verified: true,
    },
  ],
  categories: [
    {
      id: 'hardware',
      name: '硬件',
      description: '硬件相关术语',
      color: '#1890ff',
      termCount: 2,
    },
    {
      id: 'function',
      name: '功能',
      description: '功能相关术语',
      color: '#52c41a',
      termCount: 2,
    },
    {
      id: 'process',
      name: '过程',
      description: '过程相关术语',
      color: '#faad14',
      termCount: 1,
    },
    {
      id: 'signal',
      name: '信号',
      description: '信号处理术语',
      color: '#722ed1',
      termCount: 0,
    },
    {
      id: 'measurement',
      name: '测量',
      description: '测量相关术语',
      color: '#eb2f96',
      termCount: 0,
    },
  ],
  isLoading: false,
  searchQuery: '',
  selectedCategory: null,
  error: null,
}

// Slice
const terminologySlice = createSlice({
  name: 'terminology',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload
    },
    addTerm: (state, action: PayloadAction<Omit<TerminologyEntry, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const newTerm: TerminologyEntry = {
        ...action.payload,
        id: Date.now().toString(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      state.terms.unshift(newTerm)
      
      // Update category count
      const category = state.categories.find(cat => cat.id === newTerm.category)
      if (category) {
        category.termCount += 1
      }
    },
    updateTerm: (state, action: PayloadAction<TerminologyEntry>) => {
      const index = state.terms.findIndex(term => term.id === action.payload.id)
      if (index !== -1) {
        const oldCategory = state.terms[index].category
        state.terms[index] = {
          ...action.payload,
          updatedAt: Date.now(),
        }
        
        // Update category counts if category changed
        if (oldCategory !== action.payload.category) {
          const oldCat = state.categories.find(cat => cat.id === oldCategory)
          const newCat = state.categories.find(cat => cat.id === action.payload.category)
          if (oldCat) oldCat.termCount -= 1
          if (newCat) newCat.termCount += 1
        }
      }
    },
    deleteTerm: (state, action: PayloadAction<string>) => {
      const termIndex = state.terms.findIndex(term => term.id === action.payload)
      if (termIndex !== -1) {
        const term = state.terms[termIndex]
        state.terms.splice(termIndex, 1)
        
        // Update category count
        const category = state.categories.find(cat => cat.id === term.category)
        if (category) {
          category.termCount -= 1
        }
      }
    },
    verifyTerm: (state, action: PayloadAction<string>) => {
      const term = state.terms.find(term => term.id === action.payload)
      if (term) {
        term.verified = true
        term.updatedAt = Date.now()
      }
    },
    unverifyTerm: (state, action: PayloadAction<string>) => {
      const term = state.terms.find(term => term.id === action.payload)
      if (term) {
        term.verified = false
        term.updatedAt = Date.now()
      }
    },
    incrementTermFrequency: (state, action: PayloadAction<string>) => {
      const term = state.terms.find(term => term.sourceText.toLowerCase() === action.payload.toLowerCase())
      if (term) {
        term.frequency += 1
        term.updatedAt = Date.now()
      }
    },
    addCategory: (state, action: PayloadAction<Omit<TerminologyCategory, 'id' | 'termCount'>>) => {
      const newCategory: TerminologyCategory = {
        ...action.payload,
        id: Date.now().toString(),
        termCount: 0,
      }
      state.categories.push(newCategory)
    },
    updateCategory: (state, action: PayloadAction<TerminologyCategory>) => {
      const index = state.categories.findIndex(cat => cat.id === action.payload.id)
      if (index !== -1) {
        state.categories[index] = action.payload
      }
    },
    deleteCategory: (state, action: PayloadAction<string>) => {
      const categoryIndex = state.categories.findIndex(cat => cat.id === action.payload)
      if (categoryIndex !== -1) {
        // Move terms to 'uncategorized' or remove them
        state.terms = state.terms.filter(term => term.category !== action.payload)
        state.categories.splice(categoryIndex, 1)
        
        // Clear selected category if it was deleted
        if (state.selectedCategory === action.payload) {
          state.selectedCategory = null
        }
      }
    },
    importTerms: (state, action: PayloadAction<TerminologyEntry[]>) => {
      // Merge imported terms, avoiding duplicates
      const existingSourceTexts = new Set(state.terms.map(term => term.sourceText.toLowerCase()))
      const newTerms = action.payload.filter(term => 
        !existingSourceTexts.has(term.sourceText.toLowerCase())
      )
      
      state.terms.push(...newTerms)
      
      // Update category counts
      state.categories.forEach(category => {
        category.termCount = state.terms.filter(term => term.category === category.id).length
      })
    },
    clearTerms: (state) => {
      state.terms = []
      state.categories.forEach(category => {
        category.termCount = 0
      })
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
})

export const {
  setSearchQuery,
  setSelectedCategory,
  addTerm,
  updateTerm,
  deleteTerm,
  verifyTerm,
  unverifyTerm,
  incrementTermFrequency,
  addCategory,
  updateCategory,
  deleteCategory,
  importTerms,
  clearTerms,
  setLoading,
  setError,
  clearError,
} = terminologySlice.actions

// Selectors
export const selectFilteredTerms = (state: { terminology: TerminologyState }) => {
  const { terms, searchQuery, selectedCategory } = state.terminology
  
  let filteredTerms = terms
  
  // Filter by search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filteredTerms = filteredTerms.filter(term =>
      term.sourceText.toLowerCase().includes(query) ||
      term.targetText.toLowerCase().includes(query) ||
      term.notes.toLowerCase().includes(query)
    )
  }
  
  // Filter by category
  if (selectedCategory) {
    filteredTerms = filteredTerms.filter(term => term.category === selectedCategory)
  }
  
  return filteredTerms
}

export const selectTermBySourceText = (sourceText: string) => (state: { terminology: TerminologyState }) => {
  return state.terminology.terms.find(term => 
    term.sourceText.toLowerCase() === sourceText.toLowerCase()
  )
}

export const selectTermsByDomain = (domain: string) => (state: { terminology: TerminologyState }) => {
  return state.terminology.terms.filter(term => term.domain === domain)
}

export default terminologySlice.reducer
