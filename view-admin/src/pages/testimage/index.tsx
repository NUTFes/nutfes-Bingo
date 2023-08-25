import type { NextPage } from "next";
import { useState } from "react";
import styles from "@/styles/Home.module.css";
import {

} from "@/components/common";
import { handler } from "@/utils/api_methods";

const Page: NextPage = () => {
  const [base64Image, setBase64Image] = useState<string>('');

  const inputImageFile = async (event: React.FormEvent<HTMLFormElement>) => {
    const preview = document.querySelector("#preview");
    const files = document.querySelector("input[type=file]").files;

    function readAndPreview(file) {
      // `file.name` が拡張子の基準と一致していることを確認します。
      if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
        const reader = new FileReader();

        reader.readAsDataURL(file);
        console.log(reader)
      }
    }

  if (files) {
    Array.prototype.forEach.call(files, readAndPreview);
  }
}

  return (
    <div>
      <h1>Image Upload</h1>
      <form onSubmit={inputImageFile}>
        <input type="file" name="image" accept="image/*" />
        <button type="submit">Upload</button>
      </form>
      {base64Image && (
        <div>
          <h2>Base64 Image:</h2>
          {/* <img src={`data:image/png;base64,${base64Image}`} alt="Uploaded" /> */}
        </div>
      )}
    </div>
  );
};

export default Page;
