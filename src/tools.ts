import { IAMClient, ListGroupsForUserCommand, ListAttachedGroupPoliciesCommand, GetPolicyCommand, GetPolicyVersionCommand, Group, AttachedPolicy, Policy } from "@aws-sdk/client-iam";

async function getGroupsByUsername(client: IAMClient, userName: string): Promise<Group[]> {
    if (!userName) return [];
    const command = new ListGroupsForUserCommand({ UserName: userName });
    const response = await client.send(command);
    return response.Groups || [];
}

async function getAttachedPolicy(client: IAMClient, groupName: string | undefined): Promise<AttachedPolicy[]> {
    if (!groupName) return [];
    const command = new ListAttachedGroupPoliciesCommand({ GroupName: groupName });
    const response = await client.send(command);
    return response.AttachedPolicies || [];
}

async function getPolicy(client: IAMClient, policyArn: string | undefined): Promise<Policy | null> {
    if (!policyArn) return null;
    const command = new GetPolicyCommand({ PolicyArn: policyArn });
    const response = await client.send(command);
    return response.Policy || null;
}

async function getAssumeRoleArnsFromPolicy(client: IAMClient, policy: Policy): Promise<string[]> {
    if (!policy) return [];
    const command = new GetPolicyVersionCommand({ PolicyArn: policy.Arn, VersionId: policy.DefaultVersionId });
    const response = await client.send(command);
    const document = response.PolicyVersion?.Document ? JSON.parse(decodeURIComponent(response.PolicyVersion.Document)) : null;
    if (!document) return [];
    // Extracting ARNs from the policy statement
    let assumeRoleArns: string[] = [];
    if (document.Statement instanceof Array) {
        assumeRoleArns = document.Statement
            .filter((stmt: any) => stmt.Action === "sts:AssumeRole")
            .map((stmt: any) => stmt.Resource)
            .flat();
    } else if (document.Statement.Action === "sts:AssumeRole") {
        assumeRoleArns = [document.Statement.Resource];
    }
    return assumeRoleArns;
}

async function getListRoleArn(client: IAMClient, userName: string): Promise<string[]> {
    if (!userName) return [];
    const groups = await getGroupsByUsername(client, userName);
    const attachedPoliciesPromises = groups.map(group => getAttachedPolicy(client, group.GroupName));
    const attachedPolicies = await Promise.all(attachedPoliciesPromises);
    const policiesPromises = attachedPolicies.flat().map(attachedPolicy => getPolicy(client, attachedPolicy.PolicyArn));
    const policies = await Promise.all(policiesPromises);
    const assumeRoleArnsPromises = policies.filter(policy => policy !== null).map(policy => getAssumeRoleArnsFromPolicy(client, policy as Policy));
    const assumeRoleArnsArrays = await Promise.all(assumeRoleArnsPromises);
    const assumeRoleArns = assumeRoleArnsArrays.flat();
    // Deduplicate ARNs
    return [...new Set(assumeRoleArns)];
}

export default getListRoleArn;