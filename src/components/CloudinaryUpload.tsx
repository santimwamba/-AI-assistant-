import { useState, useCallback } from "react";
import { Upload, X, Image, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CloudinaryUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export function CloudinaryUpload({
  onUploadComplete,
  maxSizeMB = 10,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
}: CloudinaryUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedResult, setUploadedResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Please upload: ${acceptedTypes.join(", ")}`,
        variant: "destructive",
      });
      return false;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Maximum size is ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUpload = async (file: File) => {
    if (!validateFile(file)) return;

    try {
      // Show preview
      const base64 = await fileToBase64(file);
      setPreview(base64);
      setIsUploading(true);
      setUploadedResult(null);

      // Upload to Cloudinary
      const { data, error } = await supabase.functions.invoke("cloudinary", {
        body: { action: "upload", file: base64 },
      });

      if (error) throw error;

      setUploadedResult(data);
      onUploadComplete?.(data);

      toast({
        title: "Upload successful",
        description: "Your image has been uploaded to Cloudinary",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const clearUpload = () => {
    setPreview(null);
    setUploadedResult(null);
  };

  return (
    <Card className="p-6">
      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50"
            }
          `}
        >
          <input
            type="file"
            accept={acceptedTypes.join(",")}
            onChange={handleFileSelect}
            className="hidden"
            id="cloudinary-upload"
          />
          <label htmlFor="cloudinary-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  Drop your image here or click to browse
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports: JPG, PNG, WebP, GIF (max {maxSizeMB}MB)
                </p>
              </div>
            </div>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={uploadedResult?.url || preview}
              alt="Preview"
              className="w-full max-h-64 object-contain rounded-lg bg-muted"
            />
            {!isUploading && (
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={clearUpload}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="font-medium">Uploading...</span>
                </div>
              </div>
            )}
          </div>

          {uploadedResult && (
            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-700 dark:text-green-400">
                  Upload Complete
                </p>
                <p className="text-sm text-muted-foreground mt-1 break-all">
                  {uploadedResult.url}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{uploadedResult.width}×{uploadedResult.height}</span>
                  <span>{(uploadedResult.bytes / 1024).toFixed(1)} KB</span>
                  <span>{uploadedResult.format.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}

          {uploadedResult && (
            <Button onClick={clearUpload} variant="outline" className="w-full">
              <Image className="h-4 w-4 mr-2" />
              Upload Another Image
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
