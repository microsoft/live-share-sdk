import { Tree, TreeChangeEvents, TreeNode } from "fluid-framework";
import { IUseTreeNodeResults } from "../types";
import { useEffect, useState } from "react";

export function useTreeNode<TNode extends TreeNode | undefined = TreeNode>(
    node: TNode,
    listenerEventName: keyof TreeChangeEvents = "nodeChanged"
): IUseTreeNodeResults<TNode> {
    const [proxyNode, setProxyNode] = useState<TNode>(node);

    useEffect(() => {
        if (!node) return;
        class TreeNodeProxyHandler implements ProxyHandler<TreeNode> {}
        function onNodeChanged() {
            if (!node) return;
            setProxyNode(new Proxy(node, new TreeNodeProxyHandler()));
        }
        setProxyNode(node);
        const unsubscribe = Tree.on(node, listenerEventName, onNodeChanged);
        return unsubscribe;
    }, [node, listenerEventName]);

    return {
        node: proxyNode,
    };
}
