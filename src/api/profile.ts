import { request } from "./request";
import type {
    UserProfile,
    Persona,
    PersonaGroup,
    UploadFileResponse,
    CreatePersonaRequest,
    UpdatePersonaRequest,
    BlockedContent,
    FollowingEntry,
    UpdateMainPersonaBody,
    ReorderPersonasBody,
    PersonaGroupBody,
    ReorderGroupsBody,
} from "../types/api";

export async function getMyProfile(): Promise<UserProfile> {
    return request<UserProfile>({ method: "GET", url: "/profiles/mine" });
}

export async function getProfile(userId: string): Promise<UserProfile> {
    return request<UserProfile>({
        method: "GET",
        url: `/profiles/${userId}`,
    });
}

export async function getMyPersonas(): Promise<Persona[]> {
    return request<Persona[]>({ method: "GET", url: "/personas/mine" });
}

export async function updateMainPersona(
    data: UpdateMainPersonaBody,
): Promise<boolean> {
    return request<boolean>({
        method: "PATCH",
        url: "/profiles/mine",
        data,
    });
}

export async function createPersona(
    data: Partial<CreatePersonaRequest>,
): Promise<Persona> {
    return request<Persona>({ method: "POST", url: "/personas", data });
}

export async function updatePersona(
    personaId: string,
    data: Omit<Partial<UpdatePersonaRequest>, "id">,
): Promise<Persona> {
    return request<Persona>({
        method: "PATCH",
        url: `/personas/${personaId}`,
        data,
    });
}

export async function deletePersona(personaId: string): Promise<boolean> {
    return request<boolean>({
        method: "DELETE",
        url: `/personas/${personaId}`,
    });
}

export async function reorderPersonas(
    personas: ReorderPersonasBody[],
): Promise<boolean> {
    return request<boolean>({
        method: "PATCH",
        url: "/personas/reorder",
        data: { personas },
    });
}

export async function uploadFile(
    extension: string,
    type: string,
): Promise<UploadFileResponse> {
    return request<UploadFileResponse>({
        method: "POST",
        url: "/upload/uploadFile",
        data: { extension, type },
    });
}

export async function getPersonaGroups(): Promise<PersonaGroup[]> {
    return request<PersonaGroup[]>({
        method: "GET",
        url: "/persona-groups/mine",
    });
}

export async function createPersonaGroup(
    data: PersonaGroupBody,
): Promise<PersonaGroup> {
    return request<PersonaGroup>({
        method: "POST",
        url: "/persona-groups",
        data,
    });
}

export async function deletePersonaGroup(groupId: string): Promise<boolean> {
    return request<boolean>({
        method: "DELETE",
        url: `/persona-groups/${groupId}`,
    });
}

export async function updatePersonaGroup(
    groupId: string,
    data: PersonaGroupBody,
): Promise<PersonaGroup> {
    return request<PersonaGroup>({
        method: "PATCH",
        url: `/persona-groups/${groupId}`,
        data,
    });
}

export async function reorderPersonaGroups(
    groups: ReorderGroupsBody[],
): Promise<boolean> {
    return request<boolean>({
        method: "PATCH",
        url: "/persona-groups/reorder",
        data: { groups },
    });
}

export async function getBlockedContent(): Promise<BlockedContent> {
    return request<BlockedContent>({
        method: "GET",
        url: "/profiles/mine/blocked-content",
    });
}

export async function updateBlockedContent(
    blockList: BlockedContent,
): Promise<boolean> {
    return request<boolean>({
        method: "PATCH",
        url: "/profiles/mine",
        data: { block_list: blockList },
    });
}

export async function followUser(userId: string): Promise<boolean> {
    return request<boolean>({
        method: "POST",
        url: "/following/follow",
        data: { userId },
    });
}

export async function unfollowUser(userId: string): Promise<boolean> {
    return request<boolean>({
        method: "POST",
        url: "/following/unfollow",
        data: { userId },
    });
}

export async function getMyFollowing(): Promise<FollowingEntry[]> {
    return request<FollowingEntry[]>({
        method: "GET",
        url: "/following/v2/myfollowing",
    });
}
