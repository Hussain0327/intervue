"""Problem bank with curated coding challenges."""

from app.schemas.coding import CodingProblem, Example

# Curated problem bank - 20 problems across different difficulty levels and topics
PROBLEM_BANK: dict[str, CodingProblem] = {
    # === EASY PROBLEMS ===
    "two-sum": CodingProblem(
        id="two-sum",
        title="Two Sum",
        difficulty="easy",
        description="""Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.

You may assume that each input has exactly one solution, and you may not use the same element twice.

You can return the answer in any order.""",
        examples=[
            Example(
                input="nums = [2, 7, 11, 15], target = 9",
                output="[0, 1]",
                explanation="Because nums[0] + nums[1] == 9, we return [0, 1]."
            ),
            Example(
                input="nums = [3, 2, 4], target = 6",
                output="[1, 2]",
                explanation="Because nums[1] + nums[2] == 6, we return [1, 2]."
            ),
        ],
        constraints=[
            "2 <= nums.length <= 10^4",
            "-10^9 <= nums[i] <= 10^9",
            "-10^9 <= target <= 10^9",
            "Only one valid answer exists."
        ],
        starter_code={
            "python": "def two_sum(nums: list[int], target: int) -> list[int]:\n    # Your code here\n    pass",
            "javascript": "function twoSum(nums, target) {\n    // Your code here\n}",
            "typescript": "function twoSum(nums: number[], target: number): number[] {\n    // Your code here\n}",
            "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n        return new int[]{};\n    }\n}",
            "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your code here\n        return {};\n    }\n};",
            "go": "func twoSum(nums []int, target int) []int {\n    // Your code here\n    return nil\n}",
        },
        tags=["arrays", "hash-table"],
    ),

    "valid-parentheses": CodingProblem(
        id="valid-parentheses",
        title="Valid Parentheses",
        difficulty="easy",
        description="""Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.""",
        examples=[
            Example(input='s = "()"', output="true", explanation="Simple valid parentheses."),
            Example(input='s = "()[]{}"', output="true", explanation="Multiple types of brackets, all valid."),
            Example(input='s = "(]"', output="false", explanation="Mismatched brackets."),
        ],
        constraints=[
            "1 <= s.length <= 10^4",
            "s consists of parentheses only '()[]{}'"
        ],
        starter_code={
            "python": "def is_valid(s: str) -> bool:\n    # Your code here\n    pass",
            "javascript": "function isValid(s) {\n    // Your code here\n}",
            "typescript": "function isValid(s: string): boolean {\n    // Your code here\n}",
            "java": "class Solution {\n    public boolean isValid(String s) {\n        // Your code here\n        return false;\n    }\n}",
            "cpp": "class Solution {\npublic:\n    bool isValid(string s) {\n        // Your code here\n        return false;\n    }\n};",
            "go": "func isValid(s string) bool {\n    // Your code here\n    return false\n}",
        },
        tags=["strings", "stack"],
    ),

    "reverse-linked-list": CodingProblem(
        id="reverse-linked-list",
        title="Reverse Linked List",
        difficulty="easy",
        description="""Given the head of a singly linked list, reverse the list, and return the reversed list.

The linked list node is defined as:
```
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```""",
        examples=[
            Example(
                input="head = [1, 2, 3, 4, 5]",
                output="[5, 4, 3, 2, 1]",
                explanation="The linked list is reversed."
            ),
            Example(
                input="head = [1, 2]",
                output="[2, 1]",
                explanation="Two nodes swapped."
            ),
        ],
        constraints=[
            "The number of nodes in the list is in the range [0, 5000].",
            "-5000 <= Node.val <= 5000"
        ],
        starter_code={
            "python": "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\n\ndef reverse_list(head: ListNode) -> ListNode:\n    # Your code here\n    pass",
            "javascript": "// function ListNode(val, next) {\n//     this.val = (val===undefined ? 0 : val)\n//     this.next = (next===undefined ? null : next)\n// }\n\nfunction reverseList(head) {\n    // Your code here\n}",
            "typescript": "// class ListNode {\n//     val: number\n//     next: ListNode | null\n//     constructor(val?: number, next?: ListNode | null) {\n//         this.val = (val===undefined ? 0 : val)\n//         this.next = (next===undefined ? null : next)\n//     }\n// }\n\nfunction reverseList(head: ListNode | null): ListNode | null {\n    // Your code here\n}",
            "java": "// class ListNode {\n//     int val;\n//     ListNode next;\n//     ListNode() {}\n//     ListNode(int val) { this.val = val; }\n//     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n// }\n\nclass Solution {\n    public ListNode reverseList(ListNode head) {\n        // Your code here\n        return null;\n    }\n}",
            "cpp": "// struct ListNode {\n//     int val;\n//     ListNode *next;\n//     ListNode() : val(0), next(nullptr) {}\n//     ListNode(int x) : val(x), next(nullptr) {}\n//     ListNode(int x, ListNode *next) : val(x), next(next) {}\n// };\n\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Your code here\n        return nullptr;\n    }\n};",
            "go": "// type ListNode struct {\n//     Val int\n//     Next *ListNode\n// }\n\nfunc reverseList(head *ListNode) *ListNode {\n    // Your code here\n    return nil\n}",
        },
        tags=["linked-list", "recursion"],
    ),

    "max-subarray": CodingProblem(
        id="max-subarray",
        title="Maximum Subarray",
        difficulty="easy",
        description="""Given an integer array `nums`, find the subarray with the largest sum, and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.""",
        examples=[
            Example(
                input="nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]",
                output="6",
                explanation="The subarray [4, -1, 2, 1] has the largest sum 6."
            ),
            Example(
                input="nums = [1]",
                output="1",
                explanation="The subarray [1] has the largest sum 1."
            ),
            Example(
                input="nums = [5, 4, -1, 7, 8]",
                output="23",
                explanation="The subarray [5, 4, -1, 7, 8] has the largest sum 23."
            ),
        ],
        constraints=[
            "1 <= nums.length <= 10^5",
            "-10^4 <= nums[i] <= 10^4"
        ],
        starter_code={
            "python": "def max_sub_array(nums: list[int]) -> int:\n    # Your code here\n    pass",
            "javascript": "function maxSubArray(nums) {\n    // Your code here\n}",
            "typescript": "function maxSubArray(nums: number[]): number {\n    // Your code here\n}",
            "java": "class Solution {\n    public int maxSubArray(int[] nums) {\n        // Your code here\n        return 0;\n    }\n}",
            "cpp": "class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Your code here\n        return 0;\n    }\n};",
            "go": "func maxSubArray(nums []int) int {\n    // Your code here\n    return 0\n}",
        },
        tags=["arrays", "dynamic-programming", "divide-and-conquer"],
    ),

    "merge-sorted-arrays": CodingProblem(
        id="merge-sorted-arrays",
        title="Merge Two Sorted Arrays",
        difficulty="easy",
        description="""You are given two integer arrays `nums1` and `nums2`, sorted in non-decreasing order, and two integers `m` and `n`, representing the number of elements in `nums1` and `nums2` respectively.

Merge `nums2` into `nums1` as one sorted array.

The final sorted array should not be returned by the function, but instead be stored inside the array `nums1`. To accommodate this, `nums1` has a length of `m + n`, where the first `m` elements denote the elements that should be merged, and the last `n` elements are set to 0 and should be ignored. `nums2` has a length of `n`.""",
        examples=[
            Example(
                input="nums1 = [1, 2, 3, 0, 0, 0], m = 3, nums2 = [2, 5, 6], n = 3",
                output="[1, 2, 2, 3, 5, 6]",
                explanation="The arrays we are merging are [1,2,3] and [2,5,6]. The result is [1,2,2,3,5,6]."
            ),
        ],
        constraints=[
            "nums1.length == m + n",
            "nums2.length == n",
            "0 <= m, n <= 200",
            "1 <= m + n <= 200",
            "-10^9 <= nums1[i], nums2[j] <= 10^9"
        ],
        starter_code={
            "python": "def merge(nums1: list[int], m: int, nums2: list[int], n: int) -> None:\n    # Modify nums1 in-place\n    pass",
            "javascript": "function merge(nums1, m, nums2, n) {\n    // Modify nums1 in-place\n}",
            "typescript": "function merge(nums1: number[], m: number, nums2: number[], n: number): void {\n    // Modify nums1 in-place\n}",
            "java": "class Solution {\n    public void merge(int[] nums1, int m, int[] nums2, int n) {\n        // Modify nums1 in-place\n    }\n}",
            "cpp": "class Solution {\npublic:\n    void merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {\n        // Modify nums1 in-place\n    }\n};",
            "go": "func merge(nums1 []int, m int, nums2 []int, n int) {\n    // Modify nums1 in-place\n}",
        },
        tags=["arrays", "two-pointers", "sorting"],
    ),

    # === MEDIUM PROBLEMS ===
    "longest-substring": CodingProblem(
        id="longest-substring",
        title="Longest Substring Without Repeating Characters",
        difficulty="medium",
        description="""Given a string `s`, find the length of the longest substring without repeating characters.""",
        examples=[
            Example(
                input='s = "abcabcbb"',
                output="3",
                explanation='The answer is "abc", with the length of 3.'
            ),
            Example(
                input='s = "bbbbb"',
                output="1",
                explanation='The answer is "b", with the length of 1.'
            ),
            Example(
                input='s = "pwwkew"',
                output="3",
                explanation='The answer is "wke", with the length of 3.'
            ),
        ],
        constraints=[
            "0 <= s.length <= 5 * 10^4",
            "s consists of English letters, digits, symbols and spaces."
        ],
        starter_code={
            "python": "def length_of_longest_substring(s: str) -> int:\n    # Your code here\n    pass",
            "javascript": "function lengthOfLongestSubstring(s) {\n    // Your code here\n}",
            "typescript": "function lengthOfLongestSubstring(s: string): number {\n    // Your code here\n}",
            "java": "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Your code here\n        return 0;\n    }\n}",
            "cpp": "class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Your code here\n        return 0;\n    }\n};",
            "go": "func lengthOfLongestSubstring(s string) int {\n    // Your code here\n    return 0\n}",
        },
        tags=["strings", "sliding-window", "hash-table"],
    ),

    "add-two-numbers": CodingProblem(
        id="add-two-numbers",
        title="Add Two Numbers",
        difficulty="medium",
        description="""You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.

You may assume the two numbers do not contain any leading zero, except the number 0 itself.""",
        examples=[
            Example(
                input="l1 = [2, 4, 3], l2 = [5, 6, 4]",
                output="[7, 0, 8]",
                explanation="342 + 465 = 807, stored as [7, 0, 8] in reverse."
            ),
            Example(
                input="l1 = [0], l2 = [0]",
                output="[0]",
                explanation="0 + 0 = 0"
            ),
        ],
        constraints=[
            "The number of nodes in each linked list is in the range [1, 100].",
            "0 <= Node.val <= 9",
            "It is guaranteed that the list represents a number that does not have leading zeros."
        ],
        starter_code={
            "python": "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\n\ndef add_two_numbers(l1: ListNode, l2: ListNode) -> ListNode:\n    # Your code here\n    pass",
            "javascript": "function addTwoNumbers(l1, l2) {\n    // Your code here\n}",
            "typescript": "function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n    // Your code here\n}",
            "java": "class Solution {\n    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {\n        // Your code here\n        return null;\n    }\n}",
            "cpp": "class Solution {\npublic:\n    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {\n        // Your code here\n        return nullptr;\n    }\n};",
            "go": "func addTwoNumbers(l1 *ListNode, l2 *ListNode) *ListNode {\n    // Your code here\n    return nil\n}",
        },
        tags=["linked-list", "math"],
    ),

    "three-sum": CodingProblem(
        id="three-sum",
        title="3Sum",
        difficulty="medium",
        description="""Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.

Notice that the solution set must not contain duplicate triplets.""",
        examples=[
            Example(
                input="nums = [-1, 0, 1, 2, -1, -4]",
                output="[[-1, -1, 2], [-1, 0, 1]]",
                explanation="nums[0] + nums[1] + nums[2] = -1 + 0 + 1 = 0, nums[1] + nums[2] + nums[4] = 0 + 1 + -1 = 0, nums[0] + nums[3] + nums[4] = -1 + 2 + -1 = 0."
            ),
            Example(
                input="nums = [0, 1, 1]",
                output="[]",
                explanation="The only possible triplet does not sum up to 0."
            ),
        ],
        constraints=[
            "3 <= nums.length <= 3000",
            "-10^5 <= nums[i] <= 10^5"
        ],
        starter_code={
            "python": "def three_sum(nums: list[int]) -> list[list[int]]:\n    # Your code here\n    pass",
            "javascript": "function threeSum(nums) {\n    // Your code here\n}",
            "typescript": "function threeSum(nums: number[]): number[][] {\n    // Your code here\n}",
            "java": "class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        // Your code here\n        return new ArrayList<>();\n    }\n}",
            "cpp": "class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        // Your code here\n        return {};\n    }\n};",
            "go": "func threeSum(nums []int) [][]int {\n    // Your code here\n    return nil\n}",
        },
        tags=["arrays", "two-pointers", "sorting"],
    ),

    "binary-tree-level-order": CodingProblem(
        id="binary-tree-level-order",
        title="Binary Tree Level Order Traversal",
        difficulty="medium",
        description="""Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).""",
        examples=[
            Example(
                input="root = [3, 9, 20, null, null, 15, 7]",
                output="[[3], [9, 20], [15, 7]]",
                explanation="Level order: first level [3], second level [9, 20], third level [15, 7]."
            ),
            Example(
                input="root = [1]",
                output="[[1]]",
                explanation="Single node tree."
            ),
        ],
        constraints=[
            "The number of nodes in the tree is in the range [0, 2000].",
            "-1000 <= Node.val <= 1000"
        ],
        starter_code={
            "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\n\ndef level_order(root: TreeNode) -> list[list[int]]:\n    # Your code here\n    pass",
            "javascript": "function levelOrder(root) {\n    // Your code here\n}",
            "typescript": "function levelOrder(root: TreeNode | null): number[][] {\n    // Your code here\n}",
            "java": "class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        // Your code here\n        return new ArrayList<>();\n    }\n}",
            "cpp": "class Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        // Your code here\n        return {};\n    }\n};",
            "go": "func levelOrder(root *TreeNode) [][]int {\n    // Your code here\n    return nil\n}",
        },
        tags=["trees", "bfs", "binary-tree"],
    ),

    "coin-change": CodingProblem(
        id="coin-change",
        title="Coin Change",
        difficulty="medium",
        description="""You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.

You may assume that you have an infinite number of each kind of coin.""",
        examples=[
            Example(
                input="coins = [1, 2, 5], amount = 11",
                output="3",
                explanation="11 = 5 + 5 + 1"
            ),
            Example(
                input="coins = [2], amount = 3",
                output="-1",
                explanation="Cannot make 3 with only coins of denomination 2."
            ),
        ],
        constraints=[
            "1 <= coins.length <= 12",
            "1 <= coins[i] <= 2^31 - 1",
            "0 <= amount <= 10^4"
        ],
        starter_code={
            "python": "def coin_change(coins: list[int], amount: int) -> int:\n    # Your code here\n    pass",
            "javascript": "function coinChange(coins, amount) {\n    // Your code here\n}",
            "typescript": "function coinChange(coins: number[], amount: number): number {\n    // Your code here\n}",
            "java": "class Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Your code here\n        return 0;\n    }\n}",
            "cpp": "class Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        // Your code here\n        return 0;\n    }\n};",
            "go": "func coinChange(coins []int, amount int) int {\n    // Your code here\n    return 0\n}",
        },
        tags=["dynamic-programming", "arrays", "bfs"],
    ),

    "lru-cache": CodingProblem(
        id="lru-cache",
        title="LRU Cache",
        difficulty="medium",
        description="""Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.

Implement the LRUCache class:
- `LRUCache(int capacity)` Initialize the LRU cache with positive size capacity.
- `int get(int key)` Return the value of the key if the key exists, otherwise return -1.
- `void put(int key, int value)` Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.

The functions `get` and `put` must each run in O(1) average time complexity.""",
        examples=[
            Example(
                input='["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]',
                output="[null, null, null, 1, null, -1, null, -1, 3, 4]",
                explanation="Operations on LRU cache of capacity 2."
            ),
        ],
        constraints=[
            "1 <= capacity <= 3000",
            "0 <= key <= 10^4",
            "0 <= value <= 10^5",
            "At most 2 * 10^5 calls will be made to get and put."
        ],
        starter_code={
            "python": "class LRUCache:\n    def __init__(self, capacity: int):\n        # Your code here\n        pass\n\n    def get(self, key: int) -> int:\n        # Your code here\n        pass\n\n    def put(self, key: int, value: int) -> None:\n        # Your code here\n        pass",
            "javascript": "class LRUCache {\n    constructor(capacity) {\n        // Your code here\n    }\n\n    get(key) {\n        // Your code here\n    }\n\n    put(key, value) {\n        // Your code here\n    }\n}",
            "typescript": "class LRUCache {\n    constructor(capacity: number) {\n        // Your code here\n    }\n\n    get(key: number): number {\n        // Your code here\n    }\n\n    put(key: number, value: number): void {\n        // Your code here\n    }\n}",
            "java": "class LRUCache {\n    public LRUCache(int capacity) {\n        // Your code here\n    }\n\n    public int get(int key) {\n        // Your code here\n        return -1;\n    }\n\n    public void put(int key, int value) {\n        // Your code here\n    }\n}",
            "cpp": "class LRUCache {\npublic:\n    LRUCache(int capacity) {\n        // Your code here\n    }\n\n    int get(int key) {\n        // Your code here\n        return -1;\n    }\n\n    void put(int key, int value) {\n        // Your code here\n    }\n};",
            "go": "type LRUCache struct {\n    // Your fields here\n}\n\nfunc Constructor(capacity int) LRUCache {\n    // Your code here\n    return LRUCache{}\n}\n\nfunc (this *LRUCache) Get(key int) int {\n    // Your code here\n    return -1\n}\n\nfunc (this *LRUCache) Put(key int, value int) {\n    // Your code here\n}",
        },
        tags=["design", "hash-table", "linked-list"],
    ),

    "number-of-islands": CodingProblem(
        id="number-of-islands",
        title="Number of Islands",
        difficulty="medium",
        description="""Given an m x n 2D binary grid `grid` which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.""",
        examples=[
            Example(
                input='grid = [\n  ["1","1","1","1","0"],\n  ["1","1","0","1","0"],\n  ["1","1","0","0","0"],\n  ["0","0","0","0","0"]\n]',
                output="1",
                explanation="There is one island."
            ),
            Example(
                input='grid = [\n  ["1","1","0","0","0"],\n  ["1","1","0","0","0"],\n  ["0","0","1","0","0"],\n  ["0","0","0","1","1"]\n]',
                output="3",
                explanation="There are three islands."
            ),
        ],
        constraints=[
            "m == grid.length",
            "n == grid[i].length",
            "1 <= m, n <= 300",
            "grid[i][j] is '0' or '1'."
        ],
        starter_code={
            "python": "def num_islands(grid: list[list[str]]) -> int:\n    # Your code here\n    pass",
            "javascript": "function numIslands(grid) {\n    // Your code here\n}",
            "typescript": "function numIslands(grid: string[][]): number {\n    // Your code here\n}",
            "java": "class Solution {\n    public int numIslands(char[][] grid) {\n        // Your code here\n        return 0;\n    }\n}",
            "cpp": "class Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        // Your code here\n        return 0;\n    }\n};",
            "go": "func numIslands(grid [][]byte) int {\n    // Your code here\n    return 0\n}",
        },
        tags=["dfs", "bfs", "matrix", "union-find"],
    ),

    "word-search": CodingProblem(
        id="word-search",
        title="Word Search",
        difficulty="medium",
        description="""Given an m x n grid of characters `board` and a string `word`, return true if `word` exists in the grid.

The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.""",
        examples=[
            Example(
                input='board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"',
                output="true",
                explanation="The word can be found by following a path in the grid."
            ),
            Example(
                input='board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"',
                output="false",
                explanation="The word cannot be formed without reusing cells."
            ),
        ],
        constraints=[
            "m == board.length",
            "n == board[i].length",
            "1 <= m, n <= 6",
            "1 <= word.length <= 15",
            "board and word consists of only lowercase and uppercase English letters."
        ],
        starter_code={
            "python": "def exist(board: list[list[str]], word: str) -> bool:\n    # Your code here\n    pass",
            "javascript": "function exist(board, word) {\n    // Your code here\n}",
            "typescript": "function exist(board: string[][], word: string): boolean {\n    // Your code here\n}",
            "java": "class Solution {\n    public boolean exist(char[][] board, String word) {\n        // Your code here\n        return false;\n    }\n}",
            "cpp": "class Solution {\npublic:\n    bool exist(vector<vector<char>>& board, string word) {\n        // Your code here\n        return false;\n    }\n};",
            "go": "func exist(board [][]byte, word string) bool {\n    // Your code here\n    return false\n}",
        },
        tags=["backtracking", "dfs", "matrix"],
    ),

    "product-except-self": CodingProblem(
        id="product-except-self",
        title="Product of Array Except Self",
        difficulty="medium",
        description="""Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.

The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in O(n) time and without using the division operation.""",
        examples=[
            Example(
                input="nums = [1, 2, 3, 4]",
                output="[24, 12, 8, 6]",
                explanation="For each index, multiply all other elements."
            ),
            Example(
                input="nums = [-1, 1, 0, -3, 3]",
                output="[0, 0, 9, 0, 0]",
                explanation="Zero makes most products 0."
            ),
        ],
        constraints=[
            "2 <= nums.length <= 10^5",
            "-30 <= nums[i] <= 30",
            "The product of any prefix or suffix of nums fits in a 32-bit integer."
        ],
        starter_code={
            "python": "def product_except_self(nums: list[int]) -> list[int]:\n    # Your code here\n    pass",
            "javascript": "function productExceptSelf(nums) {\n    // Your code here\n}",
            "typescript": "function productExceptSelf(nums: number[]): number[] {\n    // Your code here\n}",
            "java": "class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        // Your code here\n        return new int[]{};\n    }\n}",
            "cpp": "class Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        // Your code here\n        return {};\n    }\n};",
            "go": "func productExceptSelf(nums []int) []int {\n    // Your code here\n    return nil\n}",
        },
        tags=["arrays", "prefix-sum"],
    ),

    # === HARD PROBLEMS ===
    "merge-k-sorted-lists": CodingProblem(
        id="merge-k-sorted-lists",
        title="Merge k Sorted Lists",
        difficulty="hard",
        description="""You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.

Merge all the linked-lists into one sorted linked-list and return it.""",
        examples=[
            Example(
                input="lists = [[1, 4, 5], [1, 3, 4], [2, 6]]",
                output="[1, 1, 2, 3, 4, 4, 5, 6]",
                explanation="Merging 3 sorted lists into one."
            ),
            Example(
                input="lists = []",
                output="[]",
                explanation="Empty input gives empty output."
            ),
        ],
        constraints=[
            "k == lists.length",
            "0 <= k <= 10^4",
            "0 <= lists[i].length <= 500",
            "-10^4 <= lists[i][j] <= 10^4",
            "lists[i] is sorted in ascending order.",
            "The sum of lists[i].length will not exceed 10^4."
        ],
        starter_code={
            "python": "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\n\ndef merge_k_lists(lists: list[ListNode]) -> ListNode:\n    # Your code here\n    pass",
            "javascript": "function mergeKLists(lists) {\n    // Your code here\n}",
            "typescript": "function mergeKLists(lists: Array<ListNode | null>): ListNode | null {\n    // Your code here\n}",
            "java": "class Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        // Your code here\n        return null;\n    }\n}",
            "cpp": "class Solution {\npublic:\n    ListNode* mergeKLists(vector<ListNode*>& lists) {\n        // Your code here\n        return nullptr;\n    }\n};",
            "go": "func mergeKLists(lists []*ListNode) *ListNode {\n    // Your code here\n    return nil\n}",
        },
        tags=["linked-list", "divide-and-conquer", "heap"],
    ),

    "trapping-rain-water": CodingProblem(
        id="trapping-rain-water",
        title="Trapping Rain Water",
        difficulty="hard",
        description="""Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.""",
        examples=[
            Example(
                input="height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]",
                output="6",
                explanation="The elevation map can trap 6 units of rain water."
            ),
            Example(
                input="height = [4, 2, 0, 3, 2, 5]",
                output="9",
                explanation="The elevation map can trap 9 units of rain water."
            ),
        ],
        constraints=[
            "n == height.length",
            "1 <= n <= 2 * 10^4",
            "0 <= height[i] <= 10^5"
        ],
        starter_code={
            "python": "def trap(height: list[int]) -> int:\n    # Your code here\n    pass",
            "javascript": "function trap(height) {\n    // Your code here\n}",
            "typescript": "function trap(height: number[]): number {\n    // Your code here\n}",
            "java": "class Solution {\n    public int trap(int[] height) {\n        // Your code here\n        return 0;\n    }\n}",
            "cpp": "class Solution {\npublic:\n    int trap(vector<int>& height) {\n        // Your code here\n        return 0;\n    }\n};",
            "go": "func trap(height []int) int {\n    // Your code here\n    return 0\n}",
        },
        tags=["arrays", "two-pointers", "dynamic-programming", "stack"],
    ),

    "word-ladder": CodingProblem(
        id="word-ladder",
        title="Word Ladder",
        difficulty="hard",
        description="""A transformation sequence from word `beginWord` to word `endWord` using a dictionary `wordList` is a sequence of words beginWord -> s1 -> s2 -> ... -> sk such that:
- Every adjacent pair of words differs by a single letter.
- Every si for 1 <= i <= k is in wordList. Note that beginWord does not need to be in wordList.
- sk == endWord

Given two words, `beginWord` and `endWord`, and a dictionary `wordList`, return the number of words in the shortest transformation sequence from beginWord to endWord, or 0 if no such sequence exists.""",
        examples=[
            Example(
                input='beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]',
                output="5",
                explanation='One shortest transformation sequence is "hit" -> "hot" -> "dot" -> "dog" -> "cog", which is 5 words long.'
            ),
            Example(
                input='beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]',
                output="0",
                explanation='The endWord "cog" is not in wordList, therefore there is no valid transformation sequence.'
            ),
        ],
        constraints=[
            "1 <= beginWord.length <= 10",
            "endWord.length == beginWord.length",
            "1 <= wordList.length <= 5000",
            "wordList[i].length == beginWord.length",
            "beginWord, endWord, and wordList[i] consist of lowercase English letters.",
            "beginWord != endWord",
            "All the words in wordList are unique."
        ],
        starter_code={
            "python": "def ladder_length(begin_word: str, end_word: str, word_list: list[str]) -> int:\n    # Your code here\n    pass",
            "javascript": "function ladderLength(beginWord, endWord, wordList) {\n    // Your code here\n}",
            "typescript": "function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {\n    // Your code here\n}",
            "java": "class Solution {\n    public int ladderLength(String beginWord, String endWord, List<String> wordList) {\n        // Your code here\n        return 0;\n    }\n}",
            "cpp": "class Solution {\npublic:\n    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {\n        // Your code here\n        return 0;\n    }\n};",
            "go": "func ladderLength(beginWord string, endWord string, wordList []string) int {\n    // Your code here\n    return 0\n}",
        },
        tags=["bfs", "strings", "hash-table"],
    ),

    "median-two-arrays": CodingProblem(
        id="median-two-arrays",
        title="Median of Two Sorted Arrays",
        difficulty="hard",
        description="""Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.

The overall run time complexity should be O(log(m+n)).""",
        examples=[
            Example(
                input="nums1 = [1, 3], nums2 = [2]",
                output="2.00000",
                explanation="merged array = [1,2,3] and median is 2."
            ),
            Example(
                input="nums1 = [1, 2], nums2 = [3, 4]",
                output="2.50000",
                explanation="merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5."
            ),
        ],
        constraints=[
            "nums1.length == m",
            "nums2.length == n",
            "0 <= m <= 1000",
            "0 <= n <= 1000",
            "1 <= m + n <= 2000",
            "-10^6 <= nums1[i], nums2[i] <= 10^6"
        ],
        starter_code={
            "python": "def find_median_sorted_arrays(nums1: list[int], nums2: list[int]) -> float:\n    # Your code here\n    pass",
            "javascript": "function findMedianSortedArrays(nums1, nums2) {\n    // Your code here\n}",
            "typescript": "function findMedianSortedArrays(nums1: number[], nums2: number[]): number {\n    // Your code here\n}",
            "java": "class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        // Your code here\n        return 0.0;\n    }\n}",
            "cpp": "class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        // Your code here\n        return 0.0;\n    }\n};",
            "go": "func findMedianSortedArrays(nums1 []int, nums2 []int) float64 {\n    // Your code here\n    return 0.0\n}",
        },
        tags=["arrays", "binary-search", "divide-and-conquer"],
    ),

    "serialize-binary-tree": CodingProblem(
        id="serialize-binary-tree",
        title="Serialize and Deserialize Binary Tree",
        difficulty="hard",
        description="""Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.""",
        examples=[
            Example(
                input="root = [1, 2, 3, null, null, 4, 5]",
                output="[1, 2, 3, null, null, 4, 5]",
                explanation="Tree is serialized and deserialized back to the same structure."
            ),
        ],
        constraints=[
            "The number of nodes in the tree is in the range [0, 10^4].",
            "-1000 <= Node.val <= 1000"
        ],
        starter_code={
            "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\n\nclass Codec:\n    def serialize(self, root: TreeNode) -> str:\n        # Your code here\n        pass\n\n    def deserialize(self, data: str) -> TreeNode:\n        # Your code here\n        pass",
            "javascript": "class Codec {\n    serialize(root) {\n        // Your code here\n    }\n\n    deserialize(data) {\n        // Your code here\n    }\n}",
            "typescript": "class Codec {\n    serialize(root: TreeNode | null): string {\n        // Your code here\n    }\n\n    deserialize(data: string): TreeNode | null {\n        // Your code here\n    }\n}",
            "java": "public class Codec {\n    public String serialize(TreeNode root) {\n        // Your code here\n        return \"\";\n    }\n\n    public TreeNode deserialize(String data) {\n        // Your code here\n        return null;\n    }\n}",
            "cpp": "class Codec {\npublic:\n    string serialize(TreeNode* root) {\n        // Your code here\n        return \"\";\n    }\n\n    TreeNode* deserialize(string data) {\n        // Your code here\n        return nullptr;\n    }\n};",
            "go": "type Codec struct {\n}\n\nfunc Constructor() Codec {\n    return Codec{}\n}\n\nfunc (this *Codec) serialize(root *TreeNode) string {\n    // Your code here\n    return \"\"\n}\n\nfunc (this *Codec) deserialize(data string) *TreeNode {\n    // Your code here\n    return nil\n}",
        },
        tags=["trees", "dfs", "bfs", "design"],
    ),
}


def get_problem(problem_id: str) -> CodingProblem | None:
    """Get a specific problem by ID."""
    return PROBLEM_BANK.get(problem_id)


def get_all_problems() -> list[CodingProblem]:
    """Get all problems in the bank."""
    return list(PROBLEM_BANK.values())


def get_problems_by_tags(tags: list[str]) -> list[CodingProblem]:
    """Get problems that match any of the given tags."""
    matching = []
    for problem in PROBLEM_BANK.values():
        if any(tag in problem.tags for tag in tags):
            matching.append(problem)
    return matching


def get_problems_by_difficulty(difficulty: str) -> list[CodingProblem]:
    """Get problems of a specific difficulty."""
    return [p for p in PROBLEM_BANK.values() if p.difficulty == difficulty]
