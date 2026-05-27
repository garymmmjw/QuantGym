# QuantGuide Question

## 460. Minecraft Mine

**Metadata**

- ID: `aMMiuC9YLEsRmWXa5H19`
- URL: https://www.quantguide.io/questions/minecraft-mine
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: JP Morgan, WorldQuant
- Source: original
- Tags: Expected Value, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-21 13:37:43 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that Steve in Minecraft is trapped in a dungeon and has a diamond pickaxe. There are 3 paths that he can take: Path 1 leads back to his original position after 2 days. Path 2 leads back to his original position after 4 days. Path 3 leads him to the surface after 8 days. Steve selects doors completely at random and independently between selections. Let $N$ be the number of times Steve must select a door before reaching safety and $T$ be the total amount of time it takes for Steve to get out. Furthermore, let $X_i$ represent the amount of time that Steve takes to explore the path chosen at the $i$th turn. Let $A_n = \mathbb{E}\left[T \mid N = n\right]$ and $B_n = \mathbb{E}\left[\displaystyle \sum_{k=1}^n X_i \right]$ Find $\displaystyle \lim_{n \rightarrow \infty} \dfrac{A_n}{B_n}$. If the limit doesn't exist, enter $-1$.

### Hint

Write $T$ as a sum with random upper index and apply Wald's Identity. Break up $T \mid N = n$ into two parts.

### 解答

We have that $T = \displaystyle \sum_{i=1}^N X_i$, where $X_i$ is the time spent on the $i$th selection of tunnel. This is because Steve has to do $N$ trials to escape, since $N$ is the number of trials needed before he gets out. We just have to take the average of the three times spent going down the three paths to get $\mathbb{E}[X_i]$, as they are equally likely. Thus, $$\mathbb{E}[X_i] = \dfrac{2+4+8}{3} = \dfrac{14}{3}$$ This directly implies that $B_n = \dfrac{14}{3}n$ by linearity of expectation.

$$$$

To find $A_n$, if we have that $N = n$, that means on the first $n-1$ runs of the tunnel, we have that Steve took either path 1 or 2 instead of 3, and then on the $n$th run, he chooses path 3. We thus have that $$\mathbb{E}[T \mid N = n] = \mathbb{E}\left[\displaystyle \sum_{i=1}^{n-1}X_i + X_n \hspace{3pt} \Big| \hspace{3pt} X_i \neq 8, 1 \leq i \leq n-1, X_n = 8\right]$$ These conditional expectations are equivalent because we have that $X_i = 8$ corresponds to selecting path 3. Thus, simplifying the conditional expectation, we have that this is equivalent to $\displaystyle \sum_{i=1}^{n-1}\mathbb{E}[X_i \mid X_i \neq 8] + 8$ by linearity. The expectation in the sum is just the conditional expectation of $X_i$ given that it is either $2$ or $4$. Since these occur with equal probability, the conditional expectation inside the expectation is just $3$. Since we sum it $n-1$ times, we have that $A_n = \mathbb{E}[T \mid N = n] = 3n+5$. This means that $\dfrac{A_n}{B_n} = \dfrac{9n+15}{14n}$. The limit of this function is just $\dfrac{9}{14}$, as it is the coefficients of $n$ divided.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9/14"
    ],
    "companies": [
      {
        "company": "JP Morgan"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "aMMiuC9YLEsRmWXa5H19",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-21 13:37:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3683816,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Minecraft Mine",
    "topic": "probability",
    "urlEnding": "minecraft-mine",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "JP Morgan"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "aMMiuC9YLEsRmWXa5H19",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Minecraft Mine",
    "topic": "probability",
    "urlEnding": "minecraft-mine"
  }
}
```
