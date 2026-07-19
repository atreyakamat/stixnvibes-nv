"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // assume we have input component later
import { cloudinaryUrl } from "@/lib/cloudinary";

export default function Customizer({ params }: { params: { type: string; id: string } }) {
  const { type, id } = params;
  const [text, setText] = useState("");
  const [color, setColor] = useState("ff0000");
  const [image, setImage] = useState<string | null>(null);

  // placeholder publicId
  const publicId = "sample"; // In real case you fetch the product's base image ID.
  const previewUrl = cloudinaryUrl(publicId, { width: 600, height: 600, quality: "auto", format: "auto", gravity: "center" });

  return (
    <section className="section-pad">
      <h1 className="text-2xl font-bold mb-4 capitalize">Customize {type}</h1>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Live preview */}
        <div className="relative w-full h-96">
          <Image src={previewUrl} alt="preview" fill className="object-cover rounded-lg" />
          {/* Simple overlay for text */}
          {text && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span style={{ color: `#${color}`, fontSize: "2rem", fontWeight: "bold" }}>{text}</span>
            </span>
          )}
        </div>
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Text</label>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter custom text" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color (hex)</label>
            <Input value={color} onChange={(e) => setColor(e.target.value.replace(/[^0-9a-f]/gi, ""))} placeholder="ff0000" maxLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Upload Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  setImage(url);
                }
              }}
            />
          </div>
          <Button>Save Customization</Button>
        </div>
      </div>
    </section>
  );
}
