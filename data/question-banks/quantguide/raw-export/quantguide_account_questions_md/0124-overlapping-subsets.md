# QuantGuide Question

## 124. Overlapping Subsets

**Metadata**

- ID: `EjqKZCoDLtkAO6wzSfIT`
- URL: https://www.quantguide.io/questions/overlapping-subsets
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: jhu prob edited
- Tags: Discrete Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-1 11:07:45 America/New_York
- Last Edited By: Gabe

### 题干

Consider the set $\Omega = \{1,2,\dots,20\}$. Two subsets $A$ and $B$ of $\Omega$ are uniformly at random selected from the power set of $\Omega$ independently. It is possible that $A = B$. Define $N = |A \cap B|$. Compute $\dfrac{\text{Var}(N)}{\mathbb{E}[N]}$.

### Hint

For an element $x \in A \cap B$, we know that $x \in A$ and $x \in B$. Since $A$ and $B$ are independently selected, the events $\{x \in A\}$ and $\{x \in B\}$ are independent as well.

### 解答

For an element $x \in A \cap B$, we know that $x \in A$ and $x \in B$. Since $A$ and $B$ are independently selected, the events $\{x \in A\}$ and $\{x \in B\}$ are independent as well. As the subsets are selected uniformly at random, each element has probability $\dfrac{1}{2}$ of being in the subset or not being in the subset. Therefore, each of the $20$ elements is in $A \cap B$ with probability $\dfrac{1}{4}$, independent between elements. 


$$$$
Therefore, $|A \cap B|$ just counts the number of successes (which are inclusions into the intersection) in $20$ independent trials with probability $\dfrac{1}{4}$, so $N \sim \text{Binom}\left(20,\dfrac{1}{4}\right)$. For $X \sim \text{Binom}(n,p)$, $\mathbb{E}[X] = np$ and $\text{Var}(X) = np(1-p)$, so the ratio in question here is just $1-p$. As we know the value of $p$, our answer is just $1 - \dfrac{1}{4} = \dfrac{3}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/4"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "EjqKZCoDLtkAO6wzSfIT",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-1 11:07:45 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 859358,
    "source": "jhu prob edited",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Overlapping Subsets",
    "topic": "probability",
    "urlEnding": "overlapping-subsets",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "EjqKZCoDLtkAO6wzSfIT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Overlapping Subsets",
    "topic": "probability",
    "urlEnding": "overlapping-subsets"
  }
}
```
