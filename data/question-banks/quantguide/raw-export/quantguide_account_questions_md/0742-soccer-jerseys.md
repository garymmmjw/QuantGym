# QuantGuide Question

## 742. Soccer Jerseys

**Metadata**

- ID: `A2oivhvgVMMflbdiHRrR`
- URL: https://www.quantguide.io/questions/soccer-jerseys
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: AQR, DRW
- Source: original
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-19 21:02:42 America/New_York
- Last Edited By: Gabe

### 题干

Liverpool FC sells player jerseys at random prices. The price of a Mohamed Salah jersey is normally distributed with mean $\$80$ and standard deviation $\$15$. The price of a Sadio Mane jersey is normally distributed with mean $\$70$ and standard deviation $\$20$, independent of Salah jerseys. Gabe wants to be $97.5\%$ sure that he can purchase both jerseys. How much money (in dollars) should Gabe bring with him? For the purposes of this question, take $\Phi^{-1}(0.95) = 1.65$ and $\Phi^{-1}(0.975) = 1.96$

### Hint

We want to find a value $c$ so that $\mathbb{P}[S + M \leq c] = 0.975$. $M \sim N(70,20^2)$ and $S \sim N(80,15^2)$ represent the prices of Mane and Salah jerseys, respectively. What is the distribution of the sum of independent normal random variables?

### 解答

We want to find a value $c$ so that $\mathbb{P}[S + M \leq c] = 0.975$. $M \sim N(70,20^2)$ and $S \sim N(80,15^2)$ represent the prices of Mane and Salah jerseys, respectively. Since these are independent, $M+S \sim N(150,25^2)$ by adding the parameters. Then, standardizing, $$\mathbb{P}[S+M \leq c] = \mathbb{P}\left[\dfrac{S+M - 150}{25} \leq \dfrac{c-150}{25}\right] = 0.975$$ The LHS is now standard normal, so the LHS is $\Phi\left(\dfrac{c-150}{25}\right)$. Therefore, we need to find $c$ such that $\Phi\left(\dfrac{c-150}{25}\right) = 0.975$. Using the inverse CDF, we get that $\dfrac{c-150}{25} \leq \Phi^{-1}(0.975) = 1.96$. Rearranging, $c = 150 + 25 \cdot 1.96 = 199$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "199"
    ],
    "companies": [
      {
        "company": "AQR"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "A2oivhvgVMMflbdiHRrR",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-19 21:02:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6089812,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Soccer Jerseys",
    "topic": "probability",
    "urlEnding": "soccer-jerseys",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "AQR"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "id": "A2oivhvgVMMflbdiHRrR",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Soccer Jerseys",
    "topic": "probability",
    "urlEnding": "soccer-jerseys"
  }
}
```
