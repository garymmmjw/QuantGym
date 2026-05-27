# QuantGuide Question

## 1188. Random Subsets

**Metadata**

- ID: `fEKA22kaWPw2LKdwLjoO`
- URL: https://www.quantguide.io/questions/random-subsets
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Combinatorics, Events
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-7 10:59:02 America/New_York
- Last Edited By: Gabe

### 题干

Subsets $A$ and $B$ are chosen uniformly at random from the collections of all subsets of a set $X$ of cardinality $5$. What is the probability that $A$ is a subset of $B$?

### Hint

Each element of $X$ is likely to be in any of the four sets: $A \backslash B$, $B \backslash A$, $A \cap B$, $X \backslash (A \cup B)$.

### 解答

Each element of $X$ is likely to be in any of the four sets: $A \backslash B$, $B \backslash A$, $A \cap B$, $X \backslash (A \cup B)$. In order for A to be a subset of B, $A \backslash B$ must be empty. In other words, every element of X would have to be in any of the other three sets of the four sets. Thus, the probability that $A$ is a subset of $B$ is $\left(\frac{3}{4}\right)^5 = \dfrac{243}{1024} \approx 0.24.$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "243/1024"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "fEKA22kaWPw2LKdwLjoO",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 10:59:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9861516,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Random Subsets",
    "topic": "probability",
    "urlEnding": "random-subsets",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "fEKA22kaWPw2LKdwLjoO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Random Subsets",
    "topic": "probability",
    "urlEnding": "random-subsets"
  }
}
```
