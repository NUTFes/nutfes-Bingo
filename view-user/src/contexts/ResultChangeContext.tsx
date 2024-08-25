import React, { createContext, useContext, useState } from "react";

interface ResultChangeContextProps {
  resultChange: boolean;
  toggleResultChange: () => void;
}

const ResultChangeContext = createContext<ResultChangeContextProps | undefined>(
  undefined,
);

export const ResultChangeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [resultChange, setResultChange] = useState<boolean>(true);

  const toggleResultChange = () => {
    setResultChange((prev) => !prev);
  };

  return (
    <ResultChangeContext.Provider value={{ resultChange, toggleResultChange }}>
      {children}
    </ResultChangeContext.Provider>
  );
};

export const useResultChange = (): ResultChangeContextProps => {
  const context = useContext(ResultChangeContext);
  if (!context) {
    throw new Error(
      "useResultChange must be used within a ResultChangeProvider",
    );
  }
  return context;
};
