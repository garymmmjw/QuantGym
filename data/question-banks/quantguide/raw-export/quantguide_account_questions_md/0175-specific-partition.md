# QuantGuide Question

## 175. Specific Partition

**Metadata**

- ID: `WEqfNODbJBcZOwTbq63b`
- URL: https://www.quantguide.io/questions/specific-partition
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: jhu math comp
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-2 13:58:10 America/New_York
- Last Edited By: Gabe

### 题干

Let $S=\{ 1,2,3,\dots,22 \}.$ Find the number of ways in which $S$ can be partitioned into eleven subsets such that each subset contains exactly two elements of $S$ and the absolute difference between the two elements of a subset is $1$ or $11$. 

### Hint

Arrange the elements of $S$ in the below fashion:

$$
    \begin{array}{|c|c|c|c|c|c|c|c|c|c|c|c|c|}
        \hline
         1 & 2 & 3 & 4 & 5 & 6 & 7 & 8 & 9 & 10 & 11\\
         \hline 12 & 13 & 14 & 15 & 16 & 17 & 18 & 19 & 20 & 21 & 22 \\
         \hline
    \end{array}
$$

Any two adjacent elements either vertically or horizontally will now satisfy our criterion. We can view problem now as finding the number of ways to tile the grid below with $1 \times 2$ tiles that can be placed either vertically or horizontally. 

### 解答

Arrange the elements of $S$ in the below fashion:

$$
    \begin{array}{|c|c|c|c|c|c|c|c|c|c|c|c|c|}
        \hline
         1 & 2 & 3 & 4 & 5 & 6 & 7 & 8 & 9 & 10 & 11\\
         \hline 12 & 13 & 14 & 15 & 16 & 17 & 18 & 19 & 20 & 21 & 22 \\
         \hline
    \end{array}
$$

Any two adjacent elements either vertically or horizontally will now satisfy our criterion. We can view problem now as finding the number of ways to tile the grid below with $1 \times 2$ tiles that can be placed either vertically or horizontally. 

$$$$

We derive a recurrence relation for this. Let $t_n$ be the number of ways to tile a $2 \times n$ grid with $1 \times 2$ tiles. Consider $t_{n+1}$ and the relationship between it and $t_n$. In this new grid, if we place a tile on the $(n+1)$st column vertically, there are $t_n$ remaining ways to tile it. If we place the tile horizontally, then we must place another horizontally below it and there are $t_{n-1}$ valid ways to tile it in this case. Therefore, we have that $t_{n+1} = t_n + t_{n-1}$. Furthermore, we can quickly see that $t_1 = 1$ and $t_2 = 2$. Therefore, we can see that $t_n = F_{n+1}$, the $(n+1)$st Fibonacci number, as this is just the Fibonacci sequence shifted up $1$. In particular, $n = 11$ here, so $t_{11} = F_{12} = 144$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "144"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "WEqfNODbJBcZOwTbq63b",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-2 13:58:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1357946,
    "randomizable": "",
    "source": "jhu math comp",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Specific Partition",
    "topic": "probability",
    "urlEnding": "specific-partition",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "WEqfNODbJBcZOwTbq63b",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Specific Partition",
    "topic": "probability",
    "urlEnding": "specific-partition"
  }
}
```
