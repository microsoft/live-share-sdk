import {
    ImplicitFieldSchema,
    TreeViewConfiguration,
    SharedTree,
    TreeView,
    ITree,
    InsertableTreeFieldFromImplicitField,
    TreeFieldFromImplicitField,
} from "fluid-framework";
import { IUseSharedTreeResults } from "../types";
import { useDynamicDDS } from "../shared-hooks";
import React from "react";

export function useSharedTree<
    TSchema extends ImplicitFieldSchema = ImplicitFieldSchema
>(
    uniqueKey: string,
    treeViewConfiguration: TreeViewConfiguration<TSchema>,
    initialData: InsertableTreeFieldFromImplicitField<TSchema>
): IUseSharedTreeResults<TSchema> {
    const [treeView, setTreeView] = React.useState<TreeView<TSchema>>();
    const [root, setRoot] =
        React.useState<TreeFieldFromImplicitField<TSchema>>();

    const onFirstInitialize = React.useCallback(
        (newDDS: ITree): void => {
            try {
                // Create a `treeView` with the provided `treeViewConfiguration`
                const _treeView = newDDS.viewWith(treeViewConfiguration);
                if (_treeView.compatibility.canInitialize) {
                    // Set initial data
                    _treeView.initialize(initialData);
                }
                // `onFirstInitialize` is only called for the user that created the tree, but we need this object for all clients.
                // Dispose, since we will call `sharedTree.viewWith` in a `useEffect` down below and set it to state.
                _treeView.dispose();
            } catch (err) {
                console.error(err);
            }
        },
        [treeViewConfiguration, initialData]
    );
    /**
     * User facing: dynamically load the `SharedTree` DDS for the given unique key.
     */
    const { dds: sharedTree } = useDynamicDDS<ITree>(
        uniqueKey,
        SharedTree,
        onFirstInitialize
    );

    /**
     * Sets the tree view and root view
     */
    React.useEffect(() => {
        if (!sharedTree) return;
        let _treeView: TreeView<TSchema> | undefined = undefined;
        try {
            // Create a `treeView` with the provided `treeViewConfiguration`
            _treeView = sharedTree.viewWith(treeViewConfiguration);
            setTreeView(_treeView);
        } catch (err) {
            console.error(err);
        }

        // Listen for changes to root view
        const updateRoot = (): void => {
            if (_treeView?.compatibility.canView) {
                setRoot(_treeView.root);
            } else {
                setRoot(undefined);
            }
        };

        updateRoot();
        const unsubscribeToRoot = _treeView?.events.on(
            "rootChanged",
            updateRoot
        );
        return () => {
            _treeView?.dispose();
            unsubscribeToRoot?.();
        };
    }, [sharedTree, treeViewConfiguration]);

    return {
        treeView,
        sharedTree,
        root,
    };
}
