import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error)
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data)
      console.error('Response status:', error.response.status)
      throw new Error(error.response.data.detail || 'An error occurred')
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request)
      throw new Error('No response from server. Please check your connection.')
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message)
      throw error
    }
  }
)

export interface EmailAddress {
  address: string
  name?: string
}

export interface EmailBody {
  text?: string
  html?: string
}

export interface PiplEmail {
  id: string
  message_id: string
  subject: string
  from_address_email: string
  from_address_json: EmailAddress[]
  to_address_json: EmailAddress[]
  cc_address_json?: EmailAddress[]
  timestamp_created?: string
  content_preview: string
  body: EmailBody
  label?: string
  campaign_id?: string
  lead_id?: string
  thread_id?: string
  is_unread?: boolean
}

export interface SendEmailRequest {
  to: string
  subject: string
  body: string
  reply_to_id?: string
}

export interface Lead {
  _id: string;
  organization_id: string;
  campaign_id: string;
  workspace_id: string;
  is_completed: number;
  current_step: number;
  email_account_id: string;
  created_at: string;
  modified_at: string;
  status: string;
  label: string;
  email_acc_name: string;
  camp_name: string;
  sent_step: number | null;
  replied_count: number | null;
  opened_count: number | null;
  last_sent_at: string;
  is_mx: number;
  mx: string;
  email: string;
  first_name: string;
  last_name: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  country_code: string;
  phone_number: string;
  job_title: string;
  department: string;
  company_name: string;
  company_website: string;
  industry: string;
  linkedin_person_url: string;
  linkedin_company_url: string;
  total_steps: number;
}

export interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

const api = {
  emails: {
    list: async (params?: {
      preview_only?: boolean
      lead_email?: string
      campaign_id?: string
      email_type?: 'all' | 'sent' | 'received'
      label?: string
    }) => {
      const response = await axiosInstance.get<PiplEmail[]>('/api/emails', { params })
      return response.data
    },

    send: async (data: SendEmailRequest) => {
      const response = await axiosInstance.post('/api/emails/send', data)
      return response.data
    },

    markRead: async (threadId: string) => {
      const response = await axiosInstance.post(`/api/emails/mark-read/${threadId}`)
      return response.data
    },

    getUnreadCount: async () => {
      const response = await axiosInstance.get('/api/emails/unread/count')
      return response.data.count
    }
  },

  campaigns: {
    list: async () => {
      const response = await axiosInstance.get('/api/campaigns')
      return response.data
    }
  },

  analytics: {
    get: async (campaignId?: string) => {
      const response = await axiosInstance.get('/api/analytics', {
        params: campaignId ? { campaign_id: campaignId } : undefined
      })
      return response.data
    }
  },

  labels: {
    list: async () => {
      const response = await axiosInstance.get<string[]>('/api/labels')
      return response.data
    },

    update: async (emailId: string, label: string) => {
      const response = await axiosInstance.post(`/api/emails/${emailId}/label`, null, {
        params: { label }
      })
      return response.data
    }
  },

  reply: {
    send: async (data: { to: string; subject: string; body: string; replyToId: string }) => {
      const response = await axiosInstance.post('/api/emails/send', {
        to: data.to,
        subject: data.subject,
        body: data.body,
        reply_to_id: data.replyToId
      })
      return response.data
    }
  },

  contacts: {
    list: async (params?: {
      campaign_id?: string;
      status?: string;
      label?: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      page?: number;
      limit?: number;
      sort?: string;
      direction?: 'asc' | 'desc';
    }) => {
      const response = await axiosInstance.get<LeadsResponse>('/api/leads', { params });
      return response.data;
    }
  }
}

export default api 