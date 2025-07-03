import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

// Types
export interface TranslationState {
  sourceText: string
  targetText: string
  sourceLanguage: string
  targetLanguage: string
  isTranslating: boolean
  translationProgress: number
  translationHistory: TranslationHistoryItem[]
  currentDocument: string | null
  error: string | null
}

export interface TranslationHistoryItem {
  id: string
  sourceText: string
  targetText: string
  timestamp: number
  confidence: number
  terminology: TerminologyMatch[]
}

export interface TerminologyMatch {
  source: string
  target: string
  category: string
  confidence: number
  position: {
    start: number
    end: number
  }
}

export interface TranslateRequest {
  text: string
  sourceLanguage: string
  targetLanguage: string
  documentType?: string
  preserveFormatting?: boolean
}

// Async thunks
export const translateText = createAsyncThunk(
  'translation/translateText',
  async (request: TranslateRequest, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error('翻译请求失败')
      }

      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '翻译失败')
    }
  }
)

export const translateDocument = createAsyncThunk(
  'translation/translateDocument',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/translate/document/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('文档翻译请求失败')
      }

      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '文档翻译失败')
    }
  }
)

// Initial state
const initialState: TranslationState = {
  sourceText: '',
  targetText: '',
  sourceLanguage: 'en',
  targetLanguage: 'zh',
  isTranslating: false,
  translationProgress: 0,
  translationHistory: [],
  currentDocument: null,
  error: null,
}

// Slice
const translationSlice = createSlice({
  name: 'translation',
  initialState,
  reducers: {
    setSourceText: (state, action: PayloadAction<string>) => {
      state.sourceText = action.payload
      state.error = null
    },
    setTargetText: (state, action: PayloadAction<string>) => {
      state.targetText = action.payload
    },
    setSourceLanguage: (state, action: PayloadAction<string>) => {
      state.sourceLanguage = action.payload
    },
    setTargetLanguage: (state, action: PayloadAction<string>) => {
      state.targetLanguage = action.payload
    },
    swapLanguages: (state) => {
      const tempLang = state.sourceLanguage
      const tempText = state.sourceText
      
      state.sourceLanguage = state.targetLanguage
      state.targetLanguage = tempLang
      state.sourceText = state.targetText
      state.targetText = tempText
    },
    clearTranslation: (state) => {
      state.sourceText = ''
      state.targetText = ''
      state.error = null
      state.translationProgress = 0
    },
    setCurrentDocument: (state, action: PayloadAction<string | null>) => {
      state.currentDocument = action.payload
    },
    addToHistory: (state, action: PayloadAction<TranslationHistoryItem>) => {
      state.translationHistory.unshift(action.payload)
      // Keep only last 50 items
      if (state.translationHistory.length > 50) {
        state.translationHistory = state.translationHistory.slice(0, 50)
      }
    },
    removeFromHistory: (state, action: PayloadAction<string>) => {
      state.translationHistory = state.translationHistory.filter(
        item => item.id !== action.payload
      )
    },
    clearHistory: (state) => {
      state.translationHistory = []
    },
    setTranslationProgress: (state, action: PayloadAction<number>) => {
      state.translationProgress = Math.max(0, Math.min(100, action.payload))
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // translateText
      .addCase(translateText.pending, (state) => {
        state.isTranslating = true
        state.error = null
        state.translationProgress = 0
      })
      .addCase(translateText.fulfilled, (state, action) => {
        state.isTranslating = false
        state.targetText = action.payload.translatedText
        state.translationProgress = 100
        
        // Add to history
        const historyItem: TranslationHistoryItem = {
          id: Date.now().toString(),
          sourceText: state.sourceText,
          targetText: action.payload.translatedText,
          timestamp: Date.now(),
          confidence: action.payload.confidence || 0.95,
          terminology: action.payload.terminology || [],
        }
        
        state.translationHistory.unshift(historyItem)
        if (state.translationHistory.length > 50) {
          state.translationHistory = state.translationHistory.slice(0, 50)
        }
      })
      .addCase(translateText.rejected, (state, action) => {
        state.isTranslating = false
        state.error = action.payload as string
        state.translationProgress = 0
      })
      
      // translateDocument
      .addCase(translateDocument.pending, (state) => {
        state.isTranslating = true
        state.error = null
        state.translationProgress = 0
      })
      .addCase(translateDocument.fulfilled, (state, action) => {
        state.isTranslating = false
        state.translationProgress = 100
        // Document translation results are handled by document slice
      })
      .addCase(translateDocument.rejected, (state, action) => {
        state.isTranslating = false
        state.error = action.payload as string
        state.translationProgress = 0
      })
  },
})

export const {
  setSourceText,
  setTargetText,
  setSourceLanguage,
  setTargetLanguage,
  swapLanguages,
  clearTranslation,
  setCurrentDocument,
  addToHistory,
  removeFromHistory,
  clearHistory,
  setTranslationProgress,
  clearError,
} = translationSlice.actions

export default translationSlice.reducer
