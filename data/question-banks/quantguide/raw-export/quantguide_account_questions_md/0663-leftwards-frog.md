# QuantGuide Question

## 663. Leftwards Frog

**Metadata**

- ID: `AClMeye9TqGd9tqWzGdc`
- URL: https://www.quantguide.io/questions/leftwards-frog
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: puzzledquant
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-24 08:19:41 America/New_York
- Last Edited By: Gabe

### 题干

A frog is hopping between $8$ lily pads labeled $1-8$ from left to right. The frog starts on lily pad $1$. At each turn, the frog hops to a lily pad that it has not been to yet. Find the probability the frog made exactly $1$ leftwards hop after visiting all of the stones.

### Hint

Consider the set $S = \{2,3,4,5,6,7,8\}$. These are the unvisited vertices of the frog. Some arrangement where the frog makes exactly one leftwards hop is exactly the same as asking how many ways we can partition $S$ into two subsets, say $A$ and $B$. However, there are some restrictions on the subsets here. How will the frog traverse these? 

### 解答

The frog must hop $7$ times to visit all of the lily pads, so there are $7!$ ways it can move. Consider the set $S = \{2,3,4,5,6,7,8\}$. These are the unvisited vertices of the frog. Some arrangement where the frog makes exactly one leftwards hop is exactly the same as asking how many ways we can partition $S$ into two subsets, say $A$ and $B$, where the frog hops from $1$ to all of the lily pads in $A$, ordered from left to right and then all of the lily pads in $B$ left to right. For example, let $A = \{2, 3, 6, 7\}$ and $B = \{4, 5, 8\}$. The frog would then hop in the order $2 \rightarrow 3 \rightarrow 6 \rightarrow 7 \rightarrow 4 \rightarrow 5 \rightarrow 8$. However, we have to be careful here, as if either $B$ is empty or the entire set $\{2,3,4,5,6,7,8\}$, no left hop occurs. However, there are other cases as well. Namely, to not left hop, the set $A$ must contain elements such that $\text{max}(A) < \text{min}(B)$. This occurs exactly when $A$ contains the starting sequence of the elements. This would mean we exclude $A = \{2\}, \{2,3\}, \{2,3,4\}, \dots, \{2,3,4,5,6,7\}$ (we already excluded the full set). This adds $6$ additional sets we must exclude. Therefore, Therefore, we must remove $8$ elements from the $2^7 = 128$ possibilities of how we can create the subsets. Therefore, our answer is $$\dfrac{2^7 - 8}{7!} = \dfrac{1}{42}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/42"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "AClMeye9TqGd9tqWzGdc",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-24 08:19:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5336804,
    "randomizable": "",
    "source": "puzzledquant",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Leftwards Frog",
    "topic": "probability",
    "urlEnding": "leftwards-frog",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "AClMeye9TqGd9tqWzGdc",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Leftwards Frog",
    "topic": "probability",
    "urlEnding": "leftwards-frog"
  }
}
```
