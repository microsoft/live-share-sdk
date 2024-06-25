import { Tree, TreeNode } from "fluid-framework";
import { IUseTreeNodeResults } from "../types";
import { useEffect, useState } from "react";

export function useTreeNode<TNode extends TreeNode | undefined = TreeNode>(
    node: TNode
): IUseTreeNodeResults<TNode> {
    const [proxyNode, setProxyNode] = useState<TNode>(node);
    useEffect(() => {
        if (!node) return;
        class TreeNodeProxyHandler implements ProxyHandler<TreeNode> {}
        function onNodeChanged() {
            if (!node) return;
            setProxyNode(new Proxy(node, new TreeNodeProxyHandler()));
        }
        Tree.on(node, "nodeChanged", onNodeChanged);
    }, [node]);

    return {
        node: proxyNode,
    };
}
