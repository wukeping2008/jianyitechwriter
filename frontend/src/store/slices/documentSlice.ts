import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

// Types
export interface DocumentState {
  documents: Document[]
  currentDocument: Document | null
  isLoading: boolean
  isUploading: boolean
  uploadProgress: number
  error: string | null
}

export interface Document {
  id: string
  name: string
  originalName: string
  type: 'word' | 'pdf' | 'excel' | 'text'
  size: number
  uploadedAt: number
  status: 'processing' | 'ready' | 'translating' | 'completed' | 'error'
  sourceLanguage: string
  targetLanguage: string
  originalContent: string
  translatedContent?: string
  metadata: DocumentMetadata
  translationProgress: number
}

export interface DocumentMetadata {
  pageCount?: number
  wordCount: number
  characterCount: number
  hasImages: boolean
  hasTables: boolean
  hasFormulas: boolean
  detectedTerminology: string[]
  complexity: 'low' | 'medium' | 'high'
}

export interface UploadDocumentRequest {
  file: File
  sourceLanguage: string
  targetLanguage: string
  preserveFormatting: boolean
}

// Async thunks
export const uploadDocument = createAsyncThunk(
  'document/uploadDocument',
  async (request: UploadDocumentRequest, { rejectWithValue }) => {
    try {
      const formData = new FormData()
      formData.append('file', request.file)
      formData.append('sourceLanguage', request.sourceLanguage)
      formData.append('targetLanguage', request.targetLanguage)
      formData.append('preserveFormatting', request.preserveFormatting.toString())

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('文档上传失败')
      }

      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '上传失败')
    }
  }
)

export const fetchDocuments = createAsyncThunk(
  'document/fetchDocuments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/documents')
      
      if (!response.ok) {
        throw new Error('获取文档列表失败')
      }

      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '获取文档失败')
    }
  }
)

export const fetchDocument = createAsyncThunk(
  'document/fetchDocument',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`)
      
      if (!response.ok) {
        throw new Error('获取文档详情失败')
      }

      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '获取文档失败')
    }
  }
)

export const deleteDocument = createAsyncThunk(
  'document/deleteDocument',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('删除文档失败')
      }

      return documentId
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '删除失败')
    }
  }
)

export const downloadDocument = createAsyncThunk(
  'document/downloadDocument',
  async ({ documentId, format }: { documentId: string; format: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download?format=${format}`)
      
      if (!response.ok) {
        throw new Error('下载文档失败')
      }

      const blob = await response.blob()
      return { blob, documentId, format }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '下载失败')
    }
  }
)

// Initial state
const initialState: DocumentState = {
  documents: [],
  currentDocument: null,
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  error: null,
}

// Slice
const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    setCurrentDocument: (state, action: PayloadAction<Document | null>) => {
      state.currentDocument = action.payload
    },
    updateDocumentProgress: (state, action: PayloadAction<{ id: string; progress: number }>) => {
      const document = state.documents.find(doc => doc.id === action.payload.id)
      if (document) {
        document.translationProgress = action.payload.progress
      }
      if (state.currentDocument?.id === action.payload.id) {
        state.currentDocument.translationProgress = action.payload.progress
      }
    },
    updateDocumentStatus: (state, action: PayloadAction<{ id: string; status: Document['status'] }>) => {
      const document = state.documents.find(doc => doc.id === action.payload.id)
      if (document) {
        document.status = action.payload.status
      }
      if (state.currentDocument?.id === action.payload.id) {
        state.currentDocument.status = action.payload.status
      }
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = Math.max(0, Math.min(100, action.payload))
    },
    clearError: (state) => {
      state.error = null
    },
    clearDocuments: (state) => {
      state.documents = []
      state.currentDocument = null
    },
  },
  extraReducers: (builder) => {
    builder
      // uploadDocument
      .addCase(uploadDocument.pending, (state) => {
        state.isUploading = true
        state.error = null
        state.uploadProgress = 0
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.isUploading = false
        state.uploadProgress = 100
        state.documents.unshift(action.payload)
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.isUploading = false
        state.error = action.payload as string
        state.uploadProgress = 0
      })
      
      // fetchDocuments
      .addCase(fetchDocuments.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.isLoading = false
        state.documents = action.payload
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // fetchDocument
      .addCase(fetchDocument.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchDocument.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentDocument = action.payload
        
        // Update document in list if it exists
        const index = state.documents.findIndex(doc => doc.id === action.payload.id)
        if (index !== -1) {
          state.documents[index] = action.payload
        }
      })
      .addCase(fetchDocument.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // deleteDocument
      .addCase(deleteDocument.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.isLoading = false
        state.documents = state.documents.filter(doc => doc.id !== action.payload)
        if (state.currentDocument?.id === action.payload) {
          state.currentDocument = null
        }
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // downloadDocument
      .addCase(downloadDocument.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(downloadDocument.fulfilled, (state) => {
        state.isLoading = false
        // Download handling is done in the component
      })
      .addCase(downloadDocument.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const {
  setCurrentDocument,
  updateDocumentProgress,
  updateDocumentStatus,
  setUploadProgress,
  clearError,
  clearDocuments,
} = documentSlice.actions

export default documentSlice.reducer
