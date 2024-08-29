import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useMutation, useSubscription } from "@apollo/client";
import {
  SubscriotionStampTriggersDocument,
  UpdateOneTriggerFlagDocument,
} from "@/type/graphql";
import type {
  SubscriotionStampTriggersSubscription,
  UpdateOneTriggerFlagMutation,
  UpdateOneTriggerFlagMutationVariables,
} from "@/type/graphql";
import { useRouter } from "next/router";

// TODO テストページは削除する
const HomePage: React.FC = () => {
  const router = useRouter();
  const pageName = router.pathname;

  const [updateFlag] = useMutation<
    UpdateOneTriggerFlagMutation,
    UpdateOneTriggerFlagMutationVariables
  >(UpdateOneTriggerFlagDocument);
  const [isFlag, setIsFlag] = useState<boolean>(false);

  useEffect(() => {
    updateFlag({ variables: { id: 2, trigger: isFlag } });
  }, [isFlag]); // isFlagが変更されたときに実行される

  const handleClick = () => {
    setIsFlag(!isFlag);
  };
  return <div></div>;
};

export default HomePage;
