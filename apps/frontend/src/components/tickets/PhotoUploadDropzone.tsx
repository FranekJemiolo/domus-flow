/**
 * Photo Upload & Dropzone Component
 * Supports drag-and-drop, camera capture, file picking, and automatic compression
 */

import React, { useState, useRef } from 'react';
import { compressAndEncodeImage } from '../../utils/imageUtils';

interface PhotoUploadDropzoneProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export const PhotoUploadDropzone: React.FC<PhotoUploadDropzoneProps> = ({
  photos,
  onChange,
  maxPhotos = 4,
}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (photos.length >= maxPhotos) {
      alert(`Maximum of ${maxPhotos} photos allowed per ticket.`);
      return;
    }

    setIsCompressing(true);
    const newPhotos = [...photos];

    try {
      for (let i = 0; i < files.length; i++) {
        if (newPhotos.length >= maxPhotos) break;
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const result = await compressAndEncodeImage(file);
        newPhotos.push(result.dataUrl);
      }
      onChange(newPhotos);
    } catch (err) {
      console.error('Error processing photos:', err);
      alert('Failed to process image attachment.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          Photo Evidence ({photos.length}/{maxPhotos})
        </label>
        <span className="text-[11px] text-slate-500">JPG, PNG, WebP up to 10MB</span>
      </div>

      {/* Upload Drop Area */}
      {photos.length < maxPhotos && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/50'
              : 'border-slate-300 bg-slate-50/70 hover:border-slate-400 hover:bg-slate-100/50'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="text-2xl">📸</span>
            <div className="text-xs text-slate-600">
              <span
                className="font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload photos
              </span>{' '}
              or drag and drop here
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-[11px] text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                Browse Files
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[11px] text-indigo-700 border border-indigo-200/80 transition-colors flex items-center gap-1"
              >
                <span>📷 Take Photo</span>
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => processFiles(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => processFiles(e.target.files)}
          />
        </div>
      )}

      {/* Compression Status Indicator */}
      {isCompressing && (
        <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-200">
          <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Compressing & optimizing photo...</span>
        </div>
      )}

      {/* Photo Previews Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {photos.map((url, idx) => (
            <div
              key={idx}
              className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs"
            >
              <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center opacity-90 hover:opacity-100 shadow-md transition-opacity"
                title="Remove photo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
