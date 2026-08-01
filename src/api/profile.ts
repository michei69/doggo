import { apiClient } from "./client";
import type {
    UserProfile,
    Persona,
    PersonaGroup,
    UploadFileResponse,
    CreatePersonaRequest,
    UpdatePersonaRequest,
    BlockedContent,
} from "../types/api";

export async function getMyProfile(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>("/profiles/mine");
    return response.data;
}

export async function getProfile(userId: string): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>(`/profiles/${userId}`);
    return response.data;
}

export async function getMyPersonas(): Promise<Persona[]> {
    const response = await apiClient.get<Persona[]>("/personas/mine");
    return response.data;
}

export async function updateMainPersona(data: {
    avatar: string;
    name: string;
    profile: string;
}): Promise<boolean> {
    const response = await apiClient.patch<boolean>("/profiles/mine", data);
    return response.data;
}

export async function createPersona(
    data: Partial<CreatePersonaRequest>,
): Promise<Persona> {
    const response = await apiClient.post<Persona>("/personas", data);
    return response.data;
}

export async function updatePersona(
    personaId: string,
    data: Omit<Partial<UpdatePersonaRequest>, "id">,
): Promise<Persona> {
    const response = await apiClient.patch<Persona>(
        `/personas/${personaId}`,
        data,
    );
    return response.data;
}

export async function deletePersona(personaId: string): Promise<boolean> {
    const response = await apiClient.delete<boolean>(`/personas/${personaId}`);
    return response.data;
}

export async function reorderPersonas(
    personas: Array<{ id: string; order: number }>,
): Promise<boolean> {
    const response = await apiClient.patch<boolean>("/personas/reorder", {
        personas,
    });
    return response.data;
}

export async function uploadFile(
    extension: string,
    type: string,
): Promise<UploadFileResponse> {
    const response = await apiClient.post<UploadFileResponse>(
        "/upload/uploadFile",
        { extension, type },
    );
    return response.data;
}

export async function getPersonaGroups(): Promise<PersonaGroup[]> {
    const response = await apiClient.get<PersonaGroup[]>(
        "/persona-groups/mine",
    );
    return response.data;
}

export async function createPersonaGroup(data: {
    color: string;
    description: string;
    name: string;
}): Promise<PersonaGroup> {
    const response = await apiClient.post<PersonaGroup>(
        "/persona-groups",
        data,
    );
    return response.data;
}

export async function deletePersonaGroup(groupId: string): Promise<boolean> {
    const response = await apiClient.delete<boolean>(
        `/persona-groups/${groupId}`,
    );
    return response.data;
}

export async function updatePersonaGroup(
    groupId: string,
    data: { color: string; description: string; name: string },
): Promise<PersonaGroup> {
    const response = await apiClient.patch<PersonaGroup>(
        `/persona-groups/${groupId}`,
        data,
    );
    return response.data;
}

export async function reorderPersonaGroups(
    groups: Array<{ id: string; order: number }>,
): Promise<boolean> {
    const response = await apiClient.patch<boolean>("/persona-groups/reorder", {
        groups,
    });
    return response.data;
}

export async function getBlockedContent(): Promise<BlockedContent> {
    const response = await apiClient.get<BlockedContent>(
        "/profiles/mine/blocked-content",
    );
    return response.data;
}

export async function updateBlockedContent(
    blockList: BlockedContent,
): Promise<boolean> {
    const response = await apiClient.patch<boolean>("/profiles/mine", {
        block_list: blockList,
    });
    return response.data;
}

export async function followUser(userId: string): Promise<boolean> {
    const response = await apiClient.post<boolean>("/following/follow", {
        userId,
    });
    return response.data;
}

export async function unfollowUser(userId: string): Promise<boolean> {
    const response = await apiClient.post<boolean>("/following/unfollow", {
        userId,
    });
    return response.data;
}

export interface FollowingEntry {
    user_id: string;
    user_name: string;
    avatar: string;
}

export async function getMyFollowing(): Promise<FollowingEntry[]> {
    const response = await apiClient.get<FollowingEntry[]>(
        "/following/v2/myfollowing",
    );
    return response.data;
}
