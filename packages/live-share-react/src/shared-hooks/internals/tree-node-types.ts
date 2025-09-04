import { TreeNode, Tree } from "fluid-framework";
import { proxiedChildrenKey, rawTNodeKey } from "./tree-node-constants.js";

export interface ICustomProxyHandler<TNode extends TreeNode = TreeNode> {
    [rawTNodeKey]: TNode;
    [proxiedChildrenKey]: Record<string, TreeNode>;
}

export function isProxy(value: any): value is typeof Proxy {
    return value && value["[[Handler]]"];
}

export function isCustomProxyHandler<TNode extends TreeNode = TreeNode>(
    value: any
): value is ICustomProxyHandler<TNode> {
    return value?.[rawTNodeKey] !== undefined;
}

export function isTreeNode(value: any): value is TreeNode {
    try {
        Tree.schema(value);
        return true;
    } catch (_) {
        return false;
    }
}
