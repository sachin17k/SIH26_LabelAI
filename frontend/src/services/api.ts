import axios from 'axios';
import { 
  User, Inspection, Product, ProductImage, ComplianceFinding, 
  ComplianceRule, LegalDocument, DashboardSummary, OfficerDecisionType 
} from '../types';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('labelguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('labelguard_token');
      localStorage.removeItem('labelguard_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  getCurrentUser: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  getUsers: async () => {
    const res = await api.get('/users');
    return res.data;
  },
  getAuditLogs: async () => {
    const res = await api.get('/users/audit-logs');
    return res.data;
  }
};

// Inspection Services
export const inspectionService = {
  getInspections: async (params?: { status?: string; search?: string }): Promise<Inspection[]> => {
    const res = await api.get('/inspections', { params });
    return res.data;
  },
  getInspection: async (id: number): Promise<Inspection> => {
    const res = await api.get(`/inspections/${id}`);
    return res.data;
  },
  createInspection: async (data: any): Promise<Inspection> => {
    const res = await api.post('/inspections', data);
    return res.data;
  },
  updateInspection: async (id: number, data: any): Promise<Inspection> => {
    const res = await api.put(`/inspections/${id}`, data);
    return res.data;
  },
  getEstablishments: async () => {
    const res = await api.get('/inspections/establishments/list');
    return res.data;
  },
  instantScan: async (files: File[], establishmentName?: string, inspectionId?: number, productName?: string) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    if (establishmentName) formData.append('establishment_name', establishmentName);
    if (productName) formData.append('product_name', productName);
    if (inspectionId) formData.append('inspection_id', inspectionId.toString());
    const res = await api.post('/inspections/instant-scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};

// Product Services
export const productService = {
  getProducts: async (params?: { search?: string; status?: string }): Promise<Product[]> => {
    const res = await api.get('/products', { params });
    return res.data;
  },
  addProduct: async (inspectionId: number, data: any): Promise<Product> => {
    const res = await api.post(`/products/inspection/${inspectionId}`, data);
    return res.data;
  },
  getProduct: async (id: number): Promise<Product> => {
    const res = await api.get(`/products/${id}`);
    return res.data;
  },
  deleteProduct: async (id: number) => {
    const res = await api.delete(`/products/${id}`);
    return res.data;
  }
};

// Image Services
export const imageService = {
  uploadImage: async (productId: number, side: string, file: File): Promise<ProductImage> => {
    const formData = new FormData();
    formData.append('package_side', side);
    formData.append('file', file);
    const res = await api.post(`/images/upload/${productId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  deleteImage: async (imageId: number) => {
    const res = await api.delete(`/images/${imageId}`);
    return res.data;
  },
  getImageUrl: (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:8000${path}`;
  }
};

// Analysis Services
export const analysisService = {
  triggerAnalysis: async (productId: number) => {
    const res = await api.post(`/analysis/trigger/${productId}`);
    return res.data;
  },
  getStatus: async (productId: number) => {
    const res = await api.get(`/analysis/status/${productId}`);
    return res.data;
  }
};

// Compliance Services
export const complianceService = {
  getFindings: async (productId: number): Promise<ComplianceFinding[]> => {
    const res = await api.get(`/compliance/findings/${productId}`);
    return res.data;
  },
  submitDecision: async (findingId: number, decision: OfficerDecisionType, remarks: string, evidenceNotes?: string) => {
    const res = await api.post(`/compliance/review/${findingId}`, {
      finding_id: findingId,
      decision,
      officer_remarks: remarks,
      evidence_notes: evidenceNotes
    });
    return res.data;
  }
};

// Rule Services
export const ruleService = {
  getRules: async (): Promise<ComplianceRule[]> => {
    const res = await api.get('/rules');
    return res.data;
  },
  createRule: async (data: any) => {
    const res = await api.post('/rules', data);
    return res.data;
  },
  getLegalDocuments: async (): Promise<LegalDocument[]> => {
    const res = await api.get('/legal-documents');
    return res.data;
  },
  getGazetteIndex: async (): Promise<{ total_pages: number; rules: any[] }> => {
    const res = await api.get('/rules/gazette-index');
    return res.data;
  },
  lookupRules: async (query: string) => {
    const res = await api.get('/rules/lookup', { params: { q: query } });
    return res.data;
  }
};

// Report Services
export const reportService = {
  generateReport: async (inspectionId: number, format: 'PDF' | 'DOCX') => {
    const res = await api.post('/reports/generate', { inspection_id: inspectionId, report_format: format });
    return res.data;
  },
  getReports: async (inspectionId: number) => {
    const res = await api.get(`/reports/inspection/${inspectionId}`);
    return res.data;
  },
  getDownloadUrl: (reportId: number) => `http://localhost:8000/api/v1/reports/download/${reportId}`,
  downloadPdfReport: async (inspectionId: number, fileName?: string) => {
    // 1. Generate the official report
    const rep = await reportService.generateReport(inspectionId, 'PDF');
    // 2. Fetch the report file as a binary blob using authenticated api instance
    const res = await api.get(`/reports/download/${rep.id}`, { responseType: 'blob' });
    // 3. Trigger immediate browser file download
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || rep.file_name || `Legal_Metrology_Inspection_${inspectionId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return rep;
  },
  downloadDocxReport: async (inspectionId: number, fileName?: string) => {
    const rep = await reportService.generateReport(inspectionId, 'DOCX');
    const res = await api.get(`/reports/download/${rep.id}`, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || rep.file_name || `Legal_Metrology_Inspection_${inspectionId}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return rep;
  }
};

// Dashboard Services
export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const res = await api.get('/dashboard/summary');
    return res.data;
  }
};
