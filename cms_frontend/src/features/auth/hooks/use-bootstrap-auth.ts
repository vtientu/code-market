import { useEffect, useRef, useState } from "react";
import { tokenService } from "@/lib/tokenService";

export const useBootstrapAuth = () => {
  const bootstrapped = useRef(false);
  const [ready, setReady] = useState(() => !!tokenService.getAccessToken());

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    if (tokenService.getAccessToken()) {
      setReady(true);
      return;
    }

    tokenService.refresh().finally(() => setReady(true));
  }, []);

  return { ready };
};
