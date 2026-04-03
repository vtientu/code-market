import { userKeys } from "@/features/users/keys/userKeys";
import type { IUsersParams } from "@/features/users/types/user.types";
import { useQuery } from "@tanstack/react-query";

export const getUserList = (params: IUsersParams) => {
  useQuery({
    queryKey: userKeys.list,
  });
};
