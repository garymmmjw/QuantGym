# QuantGuide Question

## 1057. 2D Paths III

**Metadata**

- ID: `cQ6JEBKuOtpzon6PpsTt`
- URL: https://www.quantguide.io/questions/2d-paths-iii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Original
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 10:07:37 America/New_York
- Last Edited By: Gabe

### 题干

You are playing a 2D game where your character is trapped in a $6 \times 6$ grid. Your character starts at $(0,0)$ and can only move up and right. There are two power-ups located at $(2,3)$ and $(4,6)$. How many possible paths can your character take to get to $(6,6)$ such that it can collect at least one power-up?

### Hint

Let $P_1$ and $P_2$ be the events that your character passes through the power-ups at $(2,3)$ and $(4,6)$, respectively. You want $|P_1 \cup P_2|$. Use Inclusion-Exclusion since these are not disjoint events.

### 解答

Let $P_1$ and $P_2$ be the events that your character passes through the power-ups at $(2,3)$ and $(4,6)$, respectively. We want $|P_1 \cup P_2|$, the event that at least one of the power-ups is passed through. We use Inclusion-Exclusion here since these are not disjoint events. This means $|P_1 \cup P_2| = |P_1| + |P_2| - |P_1 \cap P_2|$. 

$$$$

$|P_1|$ is the number of paths that pass through $(2,3)$ going to $(6,6)$. From 2D Paths II, we know this number is $350$. $|P_2|$ is the number of paths passing through $(4,6)$ that go to $(6,6)$. The number of paths from $(0,0)$ to $(4,6)$ is $\displaystyle \binom{10}{4} = 210$, as you have to choose the location of the $4$ right movements among the first $10$ and the rest will be upwards movements. After reaching $(4,6)$, there is only one valid path to $(6,6)$, which is two rightward movements. Thus, $|P_2| = 210$. Lastly, $|P_1 \cap P_2|$ is the number of paths passing through both $(2,3)$ and $(4,6)$ ending at $(6,6)$. The number of paths from $(0,0)$ to $(2,3)$ is $\displaystyle \binom{5}{2} = 10$. Next, from $(2,3)$, the number of paths to $(4,6)$ is also $\displaystyle \binom{5}{2} = 10$. Then, from $(4,6)$, there is only one path to $(6,6)$, so $|P_1 \cap P_2| = 10 \cdot 10 \cdot 1 = 100$. 

$$$$

Putting all of it together, $|P_1 \cup P_2| = 350 + 210 - 100 = 460$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "460"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "cQ6JEBKuOtpzon6PpsTt",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:07:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8613656,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "2D Paths III",
    "topic": "probability",
    "urlEnding": "2d-paths-iii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "cQ6JEBKuOtpzon6PpsTt",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "2D Paths III",
    "topic": "probability",
    "urlEnding": "2d-paths-iii"
  }
}
```
