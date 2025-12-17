import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY');
    const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary credentials are not configured');
    }

    const { action, file, publicId, transformations } = await req.json();

    if (action === 'upload') {
      if (!file) {
        throw new Error('File data is required for upload');
      }

      console.log('Uploading file to Cloudinary...');

      // Generate signature for upload
      const timestamp = Math.round(Date.now() / 1000);
      const paramsToSign = `timestamp=${timestamp}`;
      
      // Create signature
      const encoder = new TextEncoder();
      const data = encoder.encode(paramsToSign + CLOUDINARY_API_SECRET);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', CLOUDINARY_API_KEY);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Cloudinary upload error:', errorText);
        throw new Error(`Upload failed: ${errorText}`);
      }

      const result: UploadResponse = await uploadResponse.json();
      console.log('Upload successful:', result.public_id);

      return new Response(
        JSON.stringify({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'transform') {
      if (!publicId) {
        throw new Error('Public ID is required for transformation');
      }

      console.log('Generating transformed URL for:', publicId);

      // Build transformation string
      const transformStr = transformations || 'w_500,h_500,c_fill';
      
      const transformedUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformStr}/${publicId}`;

      return new Response(
        JSON.stringify({ url: transformedUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      if (!publicId) {
        throw new Error('Public ID is required for deletion');
      }

      console.log('Deleting from Cloudinary:', publicId);

      const timestamp = Math.round(Date.now() / 1000);
      const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(paramsToSign + CLOUDINARY_API_SECRET);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('api_key', CLOUDINARY_API_KEY);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);

      const deleteResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await deleteResponse.json();
      console.log('Delete result:', result);

      return new Response(
        JSON.stringify({ success: result.result === 'ok' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action. Use: upload, transform, or delete');

  } catch (error) {
    console.error('Cloudinary function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
