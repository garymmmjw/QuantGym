# QuantGuide Question

## 656. Square Cross

**Metadata**

- ID: `g8p5T7KKLhXaqHU7y4MN`
- URL: https://www.quantguide.io/questions/square-cross
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: MAO edited heavily
- Tags: Continuous Random Variables, Conditional Probability
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:58:28 America/New_York
- Last Edited By: Gabe

### 题干

A square of side length $20$ is formed in front of you. You select a point uniformly at random from the interior of the square. You then proceed to form a circle of radius $R \sim \text{Unif}(0,10)$, independent of the point selected. Find the probability that the circle you create does not intersect the square at any point.

### Hint

Condition on the radius $R = r$. What is the region the center would need to lie in?

### 解答

Let this event be called $E$. To compute $\mathbb{P}[E]$, we condition on the radius $R = r$. Namely, we have that $$\mathbb{P}[E] = \displaystyle \int_0^{10} \mathbb{P}[E \mid R = r]f_R(r)dr$$ where $f_R(r) = \dfrac{1}{10}I_{(0,10)}(r)$ is the PDF of $R$. Given that $R = r$, our center must stay in the square that is a distance $r$ away from each side. In particular, the side length of this square region where we can select our center is $20 -2r$. Thus, the probability that it lies within this region is $$\dfrac{(20 - 2r)^2}{20^2} = \dfrac{(10-r)^2}{10^2}$$ This means our probabiility is $$\mathbb{P}[E] = \displaystyle \int_0^{10} \dfrac{(10-r)^2}{10^3} dr= \dfrac{1}{10^3} \cdot \dfrac{10^3}{3} = \dfrac{1}{3}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "g8p5T7KKLhXaqHU7y4MN",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:58:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5274677,
    "source": "MAO edited heavily",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Square Cross",
    "topic": "probability",
    "urlEnding": "square-cross"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "g8p5T7KKLhXaqHU7y4MN",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Square Cross",
    "topic": "probability",
    "urlEnding": "square-cross"
  }
}
```
