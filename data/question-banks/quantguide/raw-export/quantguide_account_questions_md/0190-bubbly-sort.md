# QuantGuide Question

## 190. Bubbly Sort

**Metadata**

- ID: `k5ltCkwIvJaxk9ExfVTI`
- URL: https://www.quantguide.io/questions/bubbly-sort
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Jump Trading, Virtu Financial
- Source: Glassdoor
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-12 18:01:59 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you run one iteration of Bubble Sort on some random permutation of $(1,2,\dots,100)$. Find the probability that the list is now sorted in order. The probability is in the form $$\dfrac{a^b}{c!}$$ for integers $a,b,$ and $c$. Find $a + bc$.

### Hint

There are $99$ comparisons to be made in Bubble Sort. Namely, between positions $i$ and $i+1$ for $1 \leq i \leq 99$. At each iteration, you decide to either swap or skip the pair.

### 解答

There are $99$ comparisons to be made in Bubble Sort. Namely, between positions $i$ and $i+1$ for $1 \leq i \leq 99$. At each iteration, you decide to either swap or skip the pair. Each list of swaps or skips generates a unique original permutation that would be sorted after one iteration of the algorithm. For example, with $n = 3$, the sorted list would be $(1,2,3)$. Consider the two example cases below:

$$$$

$\text{Case 1 - Swap Swap:}$ We want to work backwards here, so first we unswap positions $2$ and $3$, yielding $(1,3,2)$. Afterwards, we unswap positions $1$ and $2$, yielding $(3,1,2)$.

$$$$

$\text{Case 2 - Swap Skip:}$ We skip switching positions $2$ and $3$. However, we swap positions $1$ and $2$, yielding $(2,1,3)$.

$$$$

Generally, each of the $2^{100 - 1} = 2^{99}$ sequences of swap and skip will lead to a unique initial configuration that yields a sorted list after $1$ iteration. Therefore, the solution is $\dfrac{2^{99}}{100!}$, meaning the answer to our question is $2 + 99 \cdot 100 = 9902$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9902"
    ],
    "companies": [
      {
        "company": "Jump Trading"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "k5ltCkwIvJaxk9ExfVTI",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-12 18:01:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1461574,
    "source": "Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Bubbly Sort",
    "topic": "probability",
    "urlEnding": "bubbly-sort",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jump Trading"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "medium",
    "id": "k5ltCkwIvJaxk9ExfVTI",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Bubbly Sort",
    "topic": "probability",
    "urlEnding": "bubbly-sort"
  }
}
```
