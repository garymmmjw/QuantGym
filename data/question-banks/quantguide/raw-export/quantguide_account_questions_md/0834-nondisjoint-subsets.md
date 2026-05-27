# QuantGuide Question

## 834. Non-Disjoint Subsets

**Metadata**

- ID: `kA2LUgCAfirINZlmaTRD`
- URL: https://www.quantguide.io/questions/nondisjoint-subsets
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: MAO edited
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $A$ and $B$ be uniformly at random selected subsets of $\{1,2,3,4,5\}$. Find the probability that $A$ and $B$ are not disjoint.

### Hint

There are $2^5 = 32$ ways to select each of $A$ and $B$, as there are $2^5$ subsets of a set of size $5$. Note that each of the $5$ elements are equally-likely to belong to $A\cap B, A\cap B^c, A^c\cap B,$ and $A^c \cap B^c$.

### 解答

There are $2^5 = 32$ ways to select each of $A$ and $B$, as there are $2^5$ subsets of a set of size $5$. Note that each of the $5$ elements are equally-likely to belong to $A\cap B, A\cap B^c, A^c\cap B,$ and $A^c \cap B^c$. We count by complement here. For the two sets to be disjoint, each of the elements must belong to  $A\cap B^c, A^c\cap B,$ or $A^c \cap B^c$ Thus, there are $3$ options per element, so there are $3^5$ ways to assign the elements so that the sets $A$ and $B$ are disjoint. Thus, there are $2^{5} \cdot 2^{5} - 3^5 = 781$ ways to select $A$ and $B$ so that they are disjoint. There are $2^5 \cdot 2^5 = 1024$ total ways to select $A$ and $B$, so the probability is $\dfrac{781}{1024}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "781/1024"
    ],
    "companies": [],
    "difficulty": "hard",
    "id": "kA2LUgCAfirINZlmaTRD",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6859448,
    "randomizable": "",
    "source": "MAO edited",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Non-Disjoint Subsets",
    "topic": "probability",
    "urlEnding": "nondisjoint-subsets"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "kA2LUgCAfirINZlmaTRD",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Non-Disjoint Subsets",
    "topic": "probability",
    "urlEnding": "nondisjoint-subsets"
  }
}
```
