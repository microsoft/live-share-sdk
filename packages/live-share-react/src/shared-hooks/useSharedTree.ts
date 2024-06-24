import {
    ImplicitFieldSchema,
    TreeViewConfiguration,
    SharedTree,
    TreeView,
    ITree,
    InsertableTreeFieldFromImplicitField,
} from "fluid-framework";
import { IUseSharedTreeResults } from "../types";
import { useDynamicDDS } from "../shared-hooks";
import React from "react";

export function useSharedTree<TSchema extends ImplicitFieldSchema>(
    uniqueKey: string,
    treeViewConfiguration: TreeViewConfiguration<TSchema>,
    initialData: InsertableTreeFieldFromImplicitField<TSchema>
): IUseSharedTreeResults<TSchema> {
    const [treeView, setTreeView] = React.useState<TreeView<TSchema>>();
    const onFirstInitialize = React.useCallback(
        (newDDS: ITree): void => {
            // Create a `treeView` with the provided `treeViewConfiguration`
            const _treeView = newDDS.viewWith(treeViewConfiguration);
            if (_treeView.compatibility.canInitialize) {
                // Set initial data
                _treeView.initialize(initialData);
            }
            // `onFirstInitialize` is only called for the user that created the tree, but we need this object for all clients.
            // Dispose, since we will call `sharedTree.viewWith` in a `useEffect` down below and set it to state.
            _treeView.dispose();
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
     * Sets the tree view
     */
    React.useEffect(() => {
        if (!sharedTree) return;
        // Create a `treeView` with the provided `treeViewConfiguration`
        const _treeView = sharedTree.viewWith(treeViewConfiguration);
        if (_treeView.compatibility.canInitialize) {
            // Also initialize here in addition to onFirstInitialize.
            // This is because there is an edge case if someone disconnects before `onFirstInitialize` is called.
            // This helps recover in that case.
            // We still want to prioritize it in `onFirstInitialize` though.
            // It helps improve the odds that the creator is the one to initialize the `SharedTree`.
            _treeView.initialize(initialData);
        }
        setTreeView(sharedTree.viewWith(treeViewConfiguration));
    }, [sharedTree, treeViewConfiguration]);

    return {
        treeView,
        sharedTree,
    };
}
