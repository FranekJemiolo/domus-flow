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
        <label className="block text-xs font-semibold text-slate-300">
          Photo Evidence ({photos.length}/{maxPhotos})
        </label>
        <span className="text-[11px] text-slate-400">JPG, PNG, WebP up to 10MB</span>
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
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-700 bg-slate-950/60 hover:border-slate-600'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="text-2xl">📸</span>
            <div className="text-xs text-slate-300">
              <span
                className="font-medium text-indigo-400 cursor-pointer"
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
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors"
              >
                Browse Files
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-[11px] text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1"
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
        <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span>Compressing & optimizing photo...</span>
        </div>
      )}

      {/* Photo Previews Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {photos.map((url, idx) => (
            <div
              key={idx}
              className="group relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-900"
            >
              <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 text-white text-xs flex items-center justify-center opacity-90 hover:opacity-100 shadow-md transition-opacity"
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
