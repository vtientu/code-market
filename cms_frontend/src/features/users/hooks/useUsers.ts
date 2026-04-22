import { userKeys } from "@/features/users/keys/userKeys";
import type { IUser, IUsersParams } from "@/features/users/types/user.types";
import { fetchClient } from "@/lib/fetchClient";
import { useQuery } from "@tanstack/react-query";

// Lists users — backend endpoint must exist at GET /users
export const useUserList = (params: IUsersParams) => {
  return useQuery<IUser[]>({
    queryKey: userKeys.list(params),
    queryFn: () => fetchClient.get<IUser[]>("/users", { params }),
  });
};
