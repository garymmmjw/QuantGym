# QuantGuide Question

## 725. Gambling Addiction

**Metadata**

- ID: `8mjlwjxPKF2njvaUZ5aH`
- URL: https://www.quantguide.io/questions/gambling-addiction
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: gabe
- Tags: Expected Value, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-8 09:42:15 America/New_York
- Last Edited By: Gabe

### 题干

Gabe has a crippling gambling addiction. As such, he plays a game where the winning number on the $n$th game, where $n \geq 1$, is uniformly at random selected from the set $\{1,2,\dots, n+2\}$. Let $W$ be the random variable representing how many times Gabe plays before he wins. Find $\mathbb{E}[W]$. If the answer is infinite, answer $-1$.

### Hint

Use the fact that for non-negative integer-valued random variables, $\mathbb{E}[X] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[X \geq k]$. Let's compute $\mathbb{P}[W \geq k]$ for a fixed $k$. This is equivalent to saying that Gabe loses each of his first $k-1$ games. 

### 解答

We use the fact that for non-negative integer-valued random variables, $\mathbb{E}[X] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[X \geq k]$. Let's compute $\mathbb{P}[W \geq k]$ for a fixed $k$. This is equivalent to saying that Gabe loses each of his first $k-1$ games. 

$$$$

On turn $k$, $k \geq 1$, there is a probability of $\dfrac{1}{k+2}$ of winning (we select uniformly at random from $k+2$ items, and only $1$ will be selected). Thus, round $k$, there is a probability of $1 - \dfrac{1}{k+2} = \dfrac{k+1}{k+2}$ of not winning. Therefore, the probability Gabe loses each of his first $k-1$ rounds is $$\mathbb{P}[W \geq k] = \dfrac{2}{3} \cdot \dfrac{3}{4} \cdot \dfrac{4}{5} \cdot \dots \cdot \dfrac{k-1}{k} \cdot \dfrac{k}{k+1} = \dfrac{2}{k+1}$$ Plugging this into our expectation formula, we see that $$\mathbb{E}[W] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[W \geq k] = \sum_{k=1}^{\infty} \dfrac{2}{k+1} = \infty$$ We know this sum diverges as it is asymptotic to the harmonic sum. Therefore, our answer to this question is $-1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "8mjlwjxPKF2njvaUZ5aH",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:42:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5906154,
    "source": "gabe",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Gambling Addiction",
    "topic": "probability",
    "urlEnding": "gambling-addiction",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "8mjlwjxPKF2njvaUZ5aH",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Gambling Addiction",
    "topic": "probability",
    "urlEnding": "gambling-addiction"
  }
}
```
