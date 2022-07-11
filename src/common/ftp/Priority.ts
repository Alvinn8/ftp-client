/**
 * A priority for a request. Higher number means it gets sent quicker.
 */
namespace Priority {
    /**
     * A request that is part of a larger task.
     */
    export const LARGE_TASK = 1;
    /**
     * A quick operation.
     */
    export const QUICK = 2;
}

export default Priority;