export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      resumes: {
        Row: {
          id: string;
          title: string;
          content: Json;
          design: Json;
          language: string;
          page_format: "A4" | "Letter";
          sort_order: number;
          source_import_path: string | null;
          source_import_type: "pdf" | "docx" | "txt" | null;
          lock_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title?: string;
          content?: Json;
          design?: Json;
          language?: string;
          page_format?: "A4" | "Letter";
          sort_order?: number;
          source_import_path?: string | null;
          source_import_type?: "pdf" | "docx" | "txt" | null;
          lock_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: Json;
          design?: Json;
          language?: string;
          page_format?: "A4" | "Letter";
          sort_order?: number;
          source_import_path?: string | null;
          source_import_type?: "pdf" | "docx" | "txt" | null;
          lock_version?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      resume_imports: {
        Row: {
          id: string;
          resume_id: string | null;
          original_name: string;
          storage_path: string;
          mime_type: string;
          status: "uploaded" | "parsing" | "completed" | "failed";
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resume_id?: string | null;
          original_name: string;
          storage_path: string;
          mime_type: string;
          status?: "uploaded" | "parsing" | "completed" | "failed";
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          resume_id?: string | null;
          status?: "uploaded" | "parsing" | "completed" | "failed";
          error_message?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
