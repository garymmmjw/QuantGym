# QuantGuide Question

## 16. Bowl of Cherries II

**Metadata**

- ID: `1AgWbpwqR6UqXwcE7gXk`
- URL: https://www.quantguide.io/questions/bowl-of-cherries-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-6 10:45:55 America/New_York
- Last Edited By: Gabe

### 题干

Amy has a bowl of $5$ red cherries and $8$ purple cherries. She takes out cherries one at a time until there are no cherries left. What is the probability that when the last red cherry is drawn, there are exactly $2$ purple cherries left?

### Hint

The only way for a bowl to have $k$ cherries left is if the remaining $k$ cherries are all purple and the $k+1$-th cherry—counting backwards—is red.

### 解答

The only way for a bowl to have $k$ cherries left is if the remaining $k$ cherries are all purple and the $k+1$-th cherry—counting backwards—is red. We now have a simple ordering problem: how many ways can $m$ red cherries and $n$ purple cherries be ordered such that the last $k$ cherries are purple and the $k+1$-th cherry from the end is red? $$$$

We begin by assigning the last $k$ cherries as purple and the $k+1$-th cherry from the end as red. We are left with $m - 1$ red cherries and $n - k$ purple cherries to order however we'd like. Correcting for overcounting (since red cherries are indistinguishable from each other and purple cherries are indistinguishable from each other), we find that there are 
\[\begin{aligned}
    \frac{(m + n - k - 1)!}{(m-1)!\,(n - k)!}
\end{aligned}\]
possible orderings. $$$$

There are a total of 
\[\begin{aligned}
    \frac{(m + n)!}{m! \, n!}
\end{aligned}\]
possible orderings of the $m$ red and $n$ purple cherries without the restriction. $$$$

Thus, the probability is 

\[\begin{aligned}
    \frac{(m + n - k - 1)!}{(m-1)!\,(n - k)!} \cdot \frac{m! \, n!}{(m + n)!} = \frac{70}{429}
\end{aligned}\]

Alternatively, we know that the last three spots must be $RPP$, so the probability of this sequence is $\dfrac{5}{13} \cdot \dfrac{8}{12} \cdot \dfrac{7}{11} = \dfrac{70}{429}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "70/429"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "1AgWbpwqR6UqXwcE7gXk",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-6 10:45:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 137911,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Bowl of Cherries II",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-ii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "1AgWbpwqR6UqXwcE7gXk",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Bowl of Cherries II",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-ii"
  }
}
```
