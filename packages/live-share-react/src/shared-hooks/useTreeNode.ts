import { Tree, TreeChangeEvents, TreeNode } from "fluid-framework";
import { IUseTreeNodeResults } from "../types";
import { useEffect, useState } from "react";

export function useTreeNode<TNode extends TreeNode | undefined = TreeNode>(
    node: TNode,
    listenerEventName: keyof TreeChangeEvents = "nodeChanged"
): IUseTreeNodeResults<TNode> {
    // When we return a proxied node to a developer, it's possible they will pass it back to us in this hook.
    // We can't listen using Tree.on using a proxy node though...
    // Thus, if we are already listening to a node from another instance of this hook, we look for the unproxied node.
    const rawNode = getRawNode(node);
    const [proxyNode, setProxyNode] = useState<TNode>(rawNode);

    useEffect(() => {
        if (!rawNode) return;

        // Set default value
        setProxyNode(rawNode);
        function onNodeChanged() {
            if (!rawNode) return;

            const proxyNode = buildProxy(rawNode);
            if (listenerEventName === "treeChanged") {
                applyProxiesToChildrenNodes(proxyNode);
            }
            setProxyNode(proxyNode);
        }
        // Listen to Fluid's base node from their TreeView so Fluid flex nodes continue to work
        const unsubscribe = Tree.on(rawNode, listenerEventName, onNodeChanged);
        return () => {
            unsubscribe();
        };
    }, [rawNode, listenerEventName]);

    return {
        node: proxyNode,
    };
}

const rawTNodeKey = "[[FluidTreeNode]]";
const proxiedChildrenKey = "[[FluidChildNodes]]";

// Type guard function

function isProxy(value: any): value is typeof Proxy {
    return value && value["[[Handler]]"];
}

function isCustomProxyHandler<TNode extends TreeNode = TreeNode>(
    value: any
): value is ICustomProxyHandler<TNode> {
    return value?.[rawTNodeKey] !== undefined;
}

function buildProxy<TNode extends TreeNode = TreeNode>(rawNode: TNode): TNode {
    const proxyHandler: ProxyHandler<TreeNode> & ICustomProxyHandler<TNode> = {
        // Add some extra stuff into the handler so we can store the original Fluid TreeNode and access it later
        // Without overriding the rest of the getters in the object.
        [rawTNodeKey]: rawNode,
        [proxiedChildrenKey]: {},
        get: (target, prop, _) => {
            if (prop === "[[Handler]]") {
                return proxyHandler;
            }
            if (
                typeof prop === "string" &&
                proxyHandler[proxiedChildrenKey][prop]
            ) {
                return proxyHandler[proxiedChildrenKey][prop];
            }
            // pass in the rawNode so Fluid doesn't get confused by our proxy object and can find the flex node
            const value = Reflect.get(target, prop, rawNode);
            return typeof value === "function" &&
                typeof prop === "string" &&
                // TODO: need a better way of identifying which types of functions need to be proxied
                // This is because if a developer uses an array prototype function, we need to return proxied
                // objects so React can detect changes to those nodes...
                !["map", "flatMap", "filter", "find", "indexOf"].includes(prop)
                ? value.bind(rawNode)
                : value;
        },
        set(target, p, newValue, _) {
            return Reflect.set(target, p, newValue, rawNode);
        },
    };
    const proxy = new Proxy(rawNode, proxyHandler);
    // Set raw node getter so we can access it before things like Tree.on
    return proxy as TNode;
}

interface ICustomProxyHandler<TNode extends TreeNode = TreeNode> {
    [rawTNodeKey]: TNode;
    [proxiedChildrenKey]: Record<string, TNode>;
}

function getCustomProxyHandler(proxy: TreeNode) {
    const handler = (proxy as any)["[[Handler]]"];
    if (isCustomProxyHandler(handler)) {
        return handler;
    }
    return undefined;
}

function getRawNodeFromProxy(proxy: TreeNode) {
    return getCustomProxyHandler(proxy)?.[rawTNodeKey];
}

function getRawNode<TNode extends TreeNode | undefined = TreeNode>(
    node: TNode
): TNode {
    if (isProxy(node)) {
        return getRawNodeFromProxy(node) as TNode;
    }
    return node;
}

function isTreeNode(value: any): value is TreeNode {
    try {
        Tree.schema(value);
        return true;
    } catch (_) {
        return false;
    }
}

// TODO: only change nodes that changed
function applyProxiesToChildrenNodes(traverseNode: TreeNode) {
    let entries = Object.entries(traverseNode);
    const proxyHandler = getCustomProxyHandler(
        // Need t
        traverseNode
    );
    if (!proxyHandler) {
        throw new Error(
            "useTreeNode onNodeChanged traverseObjectValues: cannot traverse object that is not using our custom proxy"
        );
    }
    for (let i = 0; i < entries.length; i++) {
        const [key, entry] = entries[i];
        if (
            !entry ||
            ["string", "boolean", "number", "function"].includes(
                typeof entry
            ) ||
            !isTreeNode(entry)
        ) {
            continue;
        }
        const rawEntry = getRawNode(entry);
        const proxyEntry = buildProxy(rawEntry);
        proxyHandler[proxiedChildrenKey][key] = proxyEntry;
        applyProxiesToChildrenNodes(proxyEntry);
    }
}
