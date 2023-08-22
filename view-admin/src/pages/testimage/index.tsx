import type { NextPage } from "next";
import styles from "@/styles/Home.module.css";
import {

} from "@/components/common";

const Page: NextPage = () => {
  return (
    <div>
      <title>File Input</title>
      <form id="uploadForm">
        <input type="file" id="fileInput" />
        <input type="submit" value="Upload" />
      </form>
    </div>
  );
};

export default Page;
